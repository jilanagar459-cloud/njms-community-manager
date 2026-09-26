from flask import Flask, jsonify, request, session, render_template
import os, json, secrets
from datetime import datetime
app=Flask(__name__); app.secret_key=os.environ.get('SECRET_KEY','change-this-secret-key'); ADMIN_PASSWORD=os.environ.get('ADMIN_PASSWORD','admin123')
DATA=os.path.join(os.path.dirname(__file__),'registrations.json')
with open(DATA,encoding='utf-8') as f: registrations=json.load(f)
by_no={int(x['registration_no']):x for x in registrations}
STATUSES=['Registered','Waiting','In Progress','Completed','No Show']
def save():
 with open(DATA,'w',encoding='utf-8') as f: json.dump(registrations,f,ensure_ascii=False,separators=(',',':'))
def stats():
 p=[x for x in registrations if x['status']=='In Progress']; return {'total':len(registrations),'done':sum(x['status']=='Completed' for x in registrations),'in_progress':len(p),'waiting':sum(x['status']=='Waiting' for x in registrations),'registered':sum(x['status']=='Registered' for x in registrations),'current':p[:1]}
@app.get('/')
def public(): return render_template('public.html')
@app.get('/status')
def status(): return render_template('status.html')
@app.get('/admin')
def admin(): return render_template('admin.html' if session.get('admin') else 'login.html')
@app.post('/api/login')
def login():
 d=request.get_json(silent=True) or {}; ok=secrets.compare_digest(str(d.get('password','')),ADMIN_PASSWORD)
 if ok: session['admin']=True; return jsonify(ok=True)
 return jsonify(error='Invalid password'),401
@app.post('/api/logout')
def logout(): session.clear(); return jsonify(ok=True)
@app.get('/api/stats')
def api_stats(): return jsonify(stats())
@app.get('/api/registrations')
def api_regs():
 q=request.args.get('q','').strip().lower(); st=request.args.get('status',''); return jsonify([x for x in registrations if (not st or x['status']==st) and (not q or q==str(x['registration_no']).lower() or q in x['name'].lower() or q in x.get('contact','').lower())])
@app.get('/api/registration/<int:n>')
def api_reg(n):
 x=by_no.get(n); return jsonify(x) if x else (jsonify(error='Not found'),404)
@app.post('/api/registration/<int:n>/status')
def update(n):
 if not session.get('admin'): return jsonify(error='Login required'),401
 d=request.get_json(silent=True) or {}; st=d.get('status')
 if st not in STATUSES or n not in by_no: return jsonify(error='Invalid request'),400
 if st=='In Progress':
  for x in registrations:
   if x['status']=='In Progress' and x['registration_no']!=n: x['status']='Waiting'
 by_no[n]['status']=st; by_no[n]['updated_at']=datetime.now().isoformat(timespec='seconds'); save(); return jsonify(ok=True,stats=stats())
if __name__=='__main__': app.run(host='0.0.0.0',port=int(os.environ.get('PORT',5000)))
