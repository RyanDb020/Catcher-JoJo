"""Recorded CC0 cinematic score. Sources: Kenney Impact Sounds / RPG Audio.
No oscillator synthesis, third-party voices or music; NumPy + FFmpeg required.
"""
from pathlib import Path
import subprocess, numpy as np
ROOT=Path(__file__).resolve().parents[1]; RATE=48000
src=ROOT/'assets/foley'; out=ROOT/'assets/cinematic';out.mkdir(exist_ok=True)
cache={}
def clip(name,speed=1,reverse=False):
 if name not in cache:
  raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(src/(name+'.ogg')),'-f','f32le','-ac','2','-ar',str(RATE),'-'])
  cache[name]=np.frombuffer(raw,dtype=np.float32).reshape(-1,2).copy()
 a=cache[name][::-1] if reverse else cache[name]
 if speed!=1:
  q=np.arange(0,len(a),speed);a=np.column_stack([np.interp(q,np.arange(len(a)),a[:,i]) for i in range(2)])
 return a
class Score:
 def __init__(self,duration):self.a=np.zeros((round(duration*RATE),2),dtype=np.float32)
 def add(self,name,at,gain=.4,speed=1,reverse=False,pan=0):
  a=clip(name,speed,reverse).copy()*gain;a[:,0]*=1-max(0,pan)*.5;a[:,1]*=1+min(0,pan)*.5
  fade=min(len(a)//4,round(RATE*.025));a[:fade]*=np.linspace(0,1,fade)[:,None];a[-fade:]*=np.linspace(1,0,fade)[:,None]
  for delay,wet in [(0,1),(.085,.15),(.21,.09),(.43,.04)]:
   start=round((at+delay)*RATE);n=min(len(a),len(self.a)-start)
   if n>0:self.a[start:start+n]+=a[:n]*wet
  return self
 def write(self,name):
  a=self.a;peak=np.max(np.abs(a));a*=min(3.5,.68/max(.001,peak))
  fade=min(round(RATE*.18),len(a)//5);a[:fade]*=np.linspace(0,1,fade)[:,None];a[-fade:]*=np.linspace(1,0,fade)[:,None]
  subprocess.run(['ffmpeg','-v','error','-f','f32le','-ar',str(RATE),'-ac','2','-i','-','-c:a','libmp3lame','-q:a','3',str(out/(name+'.mp3')),'-y'],input=a.astype('float32').tobytes(),check=True)
  print(name,len(a)/RATE,round(float(np.max(np.abs(a))),3))
bell='impactBell_heavy_000';metal='impactMetal_medium_000';cloth='cloth2';latch='metalLatch';swing='knifeSlice';punch='impactPunch_medium_000';heavy='impactSoft_heavy_000'
s=Score(8.664)
for i in range(8):s.add(cloth,i*.93,.17,.55+i*.07,i%2==0).add(bell,.5+i*.98,.23,.55+i*.04,False,(-1)**i*.4)
s.add(metal,2.4,.55,.7).add(bell,4.5,.4,.42).add(swing,5.8,.3,.6,True).add(metal,7.5,.48,.8).write('reveal')
s=Score(8.881633)
for i in range(36):
 t=8.35*(i/36)**.7;s.add(latch,t,.30,.65+i*.018,False,(-1)**i*.45)
 if i%3==0:s.add(cloth,t,.17,.6+i*.025,True)
s.add(bell,0,.3,.7,True).add(metal,7.8,.5,.55,True).write('rewind')
s=Score(8.359184)
s.add(cloth,0,.45,.8,True).add(bell,.65,.26,.8)
for at,rate in [(1.1,.28),(3.1,.15),(5.85,.09)]:
 end=3.1 if at==1.1 else 5.85 if at==3.1 else 7.32
 for j,t in enumerate(np.arange(at,end,rate)):
  s.add(swing,float(t),.17,1.15+(.12 if j%2 else 0),False,(-1)**j*.7).add('impactPunch_medium_'+str(j%3).zfill(3),float(t)+.05,.18,1,False,(-1)**j*.35)
s.add(heavy,7.4,.65,.55).add(metal,7.4,.48,.6).add(cloth,7.95,.23,.8).write('ora-track')
s=Score(4.5);s.add(cloth,0,.28,.5,True).add(bell,.6,.4,.45,True).add(metal,1.7,.38,.8).add(bell,2.8,.35,.6).add(heavy,3.65,.6,.55).add(metal,3.65,.5,.7).write('time-activate')
s=Score(.8);s.add(metal,0,.48,.45).add(bell,.02,.38,1.4).write('time-freeze')
s=Score(1.95);s.add(cloth,0,.32,.7,True).add(metal,.12,.6,.65).add(bell,.15,.4,.65).add(cloth,.85,.2,1.4).write('time-resume')
s=Score(2.0)
for i in range(10):s.add(latch,i*.14,.18,.7+i*.09).add(swing,i*.16,.12,1+i*.07,True)
s.write('acceleration')
s=Score(3.6)
for i in range(12):s.add(metal,i*.22,.28,.5-i*.012,True).add(cloth,i*.23,.17,.7,True)
s.add(heavy,3.0,.45,.38).write('collapse')
s=Score(4.6);s.add(bell,0,.4,.4,True).add(bell,.38,.38,.55).add(bell,.72,.26,.85).add(cloth,.9,.3,.5).add(bell,2.32,.18,1.1).write('genesis')
Score(1.3).add(heavy,0,.7,.48).add(metal,.04,.45,.6).add(bell,.13,.2,.7).write('finisher')
Score(1.4).add(metal,0,.45,.55).add(heavy,.02,.35,.7).write('defeat')
s=Score(12)
for i in range(8):s.add(cloth,i*1.5,.07,.45,i%2==0).add(bell,i*1.5,.09,.32+(i%3)*.09,False,(-1)**i*.4)
s.write('district-bed')
