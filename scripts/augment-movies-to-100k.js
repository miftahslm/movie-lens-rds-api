const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'movie_lens_minimal.db');
const TARGET = 100_000;

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

(async () => {
  const db = new sqlite3.Database(DB_PATH);
  try {
    const { cnt, mx } = await get(
      db,
      "SELECT COUNT(*) AS cnt, COALESCE(MAX(movieId),0) AS mx FROM movies"
    );

    const need = TARGET - cnt;
    if (need <= 0) {
      console.log(`No augmentation needed. Current rows: ${cnt} (>= ${TARGET})`);
      db.close();
      return;
    }

    console.log(`Current rows: ${cnt}. Need to add: ${need}. Max ID: ${mx}`);

    // pull a working set into memory (52k rows ok)
    const baseRows = await all(db, "SELECT movieId, title, genres FROM movies");

    await run(db, "BEGIN TRANSACTION");
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO movies (movieId, title, genres) VALUES (?, ?, ?)"
    );

    for (let i = 1; i <= need; i++) {
      const base = baseRows[(i - 1) % baseRows.length];
      const newId = mx + i; // ensure unique key
      const newTitle = `${base.title} [dup ${i}]`;
      await new Promise((res, rej) =>
        stmt.run([newId, newTitle, base.genres], (err) => (err ? rej(err) : res()))
      );
      if (i % 10000 === 0) console.log(`Inserted ${i}/${need}`);
    }

    await new Promise((res, rej) => stmt.finalize(err => err ? rej(err) : res()));
    await run(db, "COMMIT");
    console.log(`Augmentation complete. Total rows target: ${TARGET}`);
  } catch (e) {
    try { await run(db, "ROLLBACK"); } catch {}
    console.error("Augmentation failed:", e);
  } finally {
    db.close();
  }
})();
