from flask import Flask, render_template, request, jsonify
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
import numpy as np
import os

app = Flask(__name__)

# ── Preprocessing setup ──────────────────────────────────────────────
factory_stemmer = StemmerFactory()
stemmer = factory_stemmer.createStemmer()

factory_stop = StopWordRemoverFactory()
stopword_remover = factory_stop.createStopWordRemover()

def preprocess(text):
    """Lowercase → hapus stopword → stemming"""
    text = str(text).lower()
    text = stopword_remover.remove(text)
    text = stemmer.stem(text)
    return text

# ── Load & index data ────────────────────────────────────────────────
def load_data(csv_path="data/produk.csv"):
    df = pd.read_csv(csv_path)

    # Kolom wajib: nama_produk, harga
    # Kolom opsional: kategori, deskripsi
    # Kalau kolom deskripsi ada, gabungkan dengan nama buat TF-IDF
    if "deskripsi" in df.columns:
        df["teks_gabungan"] = df["nama_produk"] + " " + df["deskripsi"].fillna("")
    else:
        df["teks_gabungan"] = df["nama_produk"]

    df["teks_preprocessed"] = df["teks_gabungan"].apply(preprocess)
    return df

def build_tfidf(df):
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(df["teks_preprocessed"])
    return vectorizer, tfidf_matrix

# Load sekali waktu startup
CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "produk.csv")
df = load_data(CSV_PATH)
vectorizer, tfidf_matrix = build_tfidf(df)

# ── Routes ───────────────────────────────────────────────────────────
@app.route("/")
def index():
    total_produk = len(df)
    kategori_list = sorted(df["kategori"].dropna().unique().tolist()) if "kategori" in df.columns else []
    return render_template("index.html", total_produk=total_produk, kategori_list=kategori_list)

@app.route("/search")
def search():
    query = request.args.get("q", "").strip()
    kategori = request.args.get("kategori", "").strip()

    if not query:
        return jsonify({"results": [], "query": ""})

    # Preprocess query
    query_preprocessed = preprocess(query)
    query_vec = vectorizer.transform([query_preprocessed])

    # Hitung cosine similarity
    scores = cosine_similarity(query_vec, tfidf_matrix).flatten()
    df["score"] = scores

    # Filter by kategori kalau ada
    filtered = df.copy()
    if kategori and "kategori" in df.columns:
        filtered = filtered[filtered["kategori"] == kategori]

    # Ambil hasil relevan (score > 0), sort by score
    results = (
        filtered[filtered["score"] > 0]
        .sort_values("score", ascending=False)
        .head(20)
    )

    output = []
    for _, row in results.iterrows():
        item = {
            "nama_produk": row["nama_produk"],
            "harga": int(row["harga"]),
            "score": round(float(row["score"]), 4),
            "kategori": row.get("kategori", "-") if "kategori" in df.columns else "-",
        }
        if "deskripsi" in df.columns:
            item["deskripsi"] = row.get("deskripsi", "")
        output.append(item)

    return jsonify({"results": output, "query": query, "total": len(output)})

@app.route("/rekomendasi")
def rekomendasi():
    nama = request.args.get("nama", "").strip()
    if not nama:
        return jsonify({"results": []})

    # Cari produk yang dimaksud
    match = df[df["nama_produk"].str.lower() == nama.lower()]
    if match.empty:
        return jsonify({"results": [], "error": "Produk tidak ditemukan"})

    idx = match.index[0]
    produk_vec = tfidf_matrix[idx]

    # Hitung similarity ke semua produk
    scores = cosine_similarity(produk_vec, tfidf_matrix).flatten()
    scores[idx] = 0  # exclude produk itu sendiri

    top_indices = np.argsort(scores)[::-1][:6]
    results = []
    for i in top_indices:
        if scores[i] > 0:
            row = df.iloc[i]
            results.append({
                "nama_produk": row["nama_produk"],
                "harga": int(row["harga"]),
                "score": round(float(scores[i]), 4),
                "kategori": row.get("kategori", "-") if "kategori" in df.columns else "-",
            })

    return jsonify({"results": results, "referensi": nama})

if __name__ == "__main__":
    app.run(debug=True)
