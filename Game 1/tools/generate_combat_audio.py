import wave
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]/"build"/"audio-source";root.mkdir(parents=True,exist_ok=True)
sr=48000;rng=np.random.default_rng(72941)
def noise(n,k=1):
 x=rng.normal(0,1,n).astype(np.float32)
 if k>1:x=np.convolve(x,np.ones(k,dtype=np.float32)/k,mode="same")
 return x/(np.max(np.abs(x)) or 1)
def tone(n,f0,f1=None):
 t=np.arange(n,dtype=np.float32)/sr
 return np.sin(2*np.pi*(f0*t if f1 is None else f0*t+.5*(f1-f0)/(n/sr)*t*t))
def dec(t,tau):return np.exp(-t/tau)
def save(name,x):
 x=np.asarray(x,dtype=np.float32);x*=np.minimum(1,np.arange(len(x))/max(1,int(.006*sr)))
 r=min(int(.2*sr),len(x)//3);x[-r:]*=np.linspace(1,0,r)
 x*=.86/(np.max(np.abs(x)) or 1);pcm=(np.clip(x,-1,1)*32767).astype("<i2")
 with wave.open(str(root/(name+".wav")),"wb") as f:
  f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes(pcm.tobytes())
def effect(kind):
 d={"dash-whoosh":.62,"punch-light":.39,"punch-heavy":.94,"stone-steps":.42,"enemy-telegraph":.9,"enemy-hit":.58,"time-stop":1.34,"time-resume":1.55,"stand-summon":.98,"chrono-echo":.72,"district-ambience":12,"combat-music":16}[kind]
 n=int(d*sr);t=np.arange(n)/sr
 if kind=="dash-whoosh":
  p=t/d;return noise(n,14)*np.sin(np.pi*p)**1.5*.75+tone(n,165,48)*np.sin(np.pi*p)**1.8*.25
 if kind=="punch-light":
  return tone(n,148,63)*dec(t,.095)*.62+noise(n,3)*np.exp(-t/.025)*.42+(tone(n,640)*.23+tone(n,930)*.12)*dec(t,.16)
 if kind=="punch-heavy":
  return (tone(n,70,39)+.35*tone(n,118,54))*dec(t,.34)*.66+noise(n,9)*np.exp(-t/.032)*.32+(tone(n,196)*.34+tone(n,292)*.22+tone(n,487)*.13)*dec(t,.53)*.44
 if kind=="stone-steps":
  x=np.zeros(n,dtype=np.float32)
  for atsec,g in [(.018,1),(.235,.7)]:
   a=int(atsec*sr);m=n-a;tt=np.arange(m)/sr;x[a:]+=g*(noise(m,22)*np.exp(-tt/.04)*.35+tone(m,105,69)*np.exp(-tt/.06)*.44)
  return x
 if kind=="enemy-telegraph":
  x=tone(n,510,430)*dec(t,.35)*.34+tone(n,740)*dec(t,.28)*.18
  for atsec,f in [(.10,1180),(.42,940),(.72,720)]:
   a=int(atsec*sr);m=n-a;tt=np.arange(m)/sr;x[a:]+=tone(m,f,f*.62)*np.exp(-tt/.075)*.22
  return x
 if kind=="enemy-hit":return tone(n,94,42)*dec(t,.22)*.58+noise(n,6)*np.exp(-t/.06)*.38+(tone(n,330)*.15+tone(n,510)*.08)*dec(t,.29)
 if kind=="time-stop":
  p=t/d;x=noise(n,40)*np.clip(p/.7,0,1)*np.clip((1-p)/.2,0,1)*.24+tone(n,58,33)*np.clip(p/.35,0,1)*dec(t,.85)*.48
  for atsec,f in [(.20,920),(.53,720),(.81,570),(1.08,390)]:
   a=int(atsec*sr);m=n-a;tt=np.arange(m)/sr;x[a:]+=tone(m,f,f*.62)*np.exp(-tt/.075)*.18
  return x
 if kind=="time-resume":
  p=t/d;x=noise(n,30)*np.sin(np.pi*p)*.26+tone(n,42,94)*np.clip(p/.6,0,1)*dec(t,.9)*.34
  for atsec,f,g in [(.48,392,.2),(.55,587,.19),(.64,784,.14)]:
   a=int(atsec*sr);m=n-a;tt=np.arange(m)/sr;x[a:]+=g*(tone(m,f)*np.exp(-tt/.52)+.25*tone(m,f*2.01)*np.exp(-tt/.3))
  return x
 if kind=="stand-summon":return (tone(n,174,262)+.72*tone(n,261.6,392)+.34*tone(n,349,523))*np.clip(t/.35,0,1)*dec(t,.66)*.22+noise(n,72)*np.maximum(0,np.sin(t*2*np.pi*8))*.11*dec(t,.62)
 if kind=="chrono-echo":return noise(n,18)*np.maximum(0,np.sin(np.pi*t/d))*.20+tone(n,310,155)*dec(t,.31)*.25+noise(n,4)*np.exp(-t/.03)*.16
 x=(tone(n,43)*.15+tone(n,64)*.095+tone(n,86)*.055)*(.72+.28*np.sin(2*np.pi*t/d))
 x+=noise(n,120)*(.045 if kind=="district-ambience" else .012)
 if kind=="combat-music":
  for f,g in [(55,.045),(82.41,.039),(110,.034),(164.81,.029),(220,.025)]:x+=tone(n,f)*(.72+.28*np.sin(2*np.pi*t/(d/2)))*g
  k=int(.5*sr);fade=np.linspace(0,1,k);x[:k]=x[:k]*(1-fade)+x[-k:]*fade;x[-k:]=x[:k]
 return x
for name in ["dash-whoosh","punch-light","punch-heavy","stone-steps","enemy-telegraph","enemy-hit","time-stop","time-resume","stand-summon","chrono-echo","district-ambience","combat-music"]:save(name,effect(name))

