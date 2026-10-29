import sqlite3
from pathlib import Path

db = sqlite3.connect(':memory:')
db.executescript((Path(__file__).parents[1] / 'migrations/0001_init.sql').read_text())
db.execute("INSERT INTO users(id,email,google_id,created_at) VALUES('u','u@example.com','google-u',0)")
db.execute("INSERT INTO energy(user_id) VALUES('u')")
db.execute("INSERT INTO creators(id,name) VALUES('c','Creator')")
for number in range(1, 6):
    db.execute("INSERT INTO posts(id,creator_id,caption,published_at,status) VALUES(?,'c','post',0,'published')", (f'p{number}',))

def comment(cid, request, post, now):
    db.execute('INSERT INTO comments(id,request_id,user_id,post_id,content,created_at) VALUES(?,?,?,?,?,?)', (cid, request, 'u', post, 'hello', now))

def balances():
    return db.execute("SELECT free,purchased,next_refill_at FROM energy WHERE user_id='u'").fetchone()

comment('c1', 'r1', 'p1', 1000)
assert balances() == (2, 0, 14401000)
assert db.execute("SELECT score FROM relationships WHERE user_id='u' AND creator_id='c'").fetchone()[0] == 1
db.execute("DELETE FROM comments WHERE id='c1'")
comment('c2', 'r2', 'p1', 2000)
assert balances() == (2, 0, 14401000)
assert db.execute('SELECT COUNT(*) FROM token_ledger').fetchone()[0] == 1
try:
    comment('c3', 'r1', 'p2', 3000)
    raise AssertionError('deleted request must remain idempotent')
except sqlite3.IntegrityError as exc:
    assert 'idempotency_conflict' in str(exc)
comment('c4', 'r4', 'p2', 3000)
comment('c5', 'r5', 'p3', 4000)
assert balances() == (0, 0, 14401000)
try:
    comment('c6', 'r6', 'p4', 5000)
    raise AssertionError('empty energy must reject')
except sqlite3.IntegrityError as exc:
    assert 'energy_empty' in str(exc)
assert db.execute("SELECT COUNT(*) FROM comment_claims WHERE post_id='p4'").fetchone()[0] == 0
comment('c7', 'r7', 'p4', 14401000)
assert balances() == (2, 0, 28801000)
for i in range(9):
    comment(f'bulk{i}', f'bulk{i}', 'p1', 14402000)
    db.execute('DELETE FROM comments WHERE id=?', (f'bulk{i}',))
try:
    comment('limit', 'limit', 'p1', 14402000)
    raise AssertionError('deleting comments must not reset rate limit')
except sqlite3.IntegrityError as exc:
    assert 'rate_limit' in str(exc)
print('D1 schema and comment behavior checks passed')
