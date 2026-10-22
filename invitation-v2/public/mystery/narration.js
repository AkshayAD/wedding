(function () {
  'use strict';
  var audio = new Audio();
  audio.preload = 'none';
  audio.crossOrigin = 'anonymous';
  var current = null;
  var utterance = null;
  var serial = 0;
  var volume = 0.9;
  var hostIsHidden = false;
  var status = {active:false,playing:false,loading:false,kind:'',label:'',message:'',error:'',volume:volume};

  function publish() {
    status.volume = volume;
    var event;
    if (typeof window.CustomEvent === 'function') event = new CustomEvent('varsha-narration-status', {detail:getStatus()});
    else { event=document.createEvent('CustomEvent');event.initCustomEvent('varsha-narration-status',false,false,getStatus()); }
    window.dispatchEvent(event);
  }
  function getStatus() {
    return {active:status.active,playing:status.playing,loading:status.loading,kind:status.kind,label:status.label,message:status.message,error:status.error,volume:volume,duration:isFinite(audio.duration)?audio.duration:0,currentTime:audio.currentTime || 0};
  }
  function duck(value) { if(window.VARSHA_SOUND && window.VARSHA_SOUND.setNarrating)window.VARSHA_SOUND.setNarrating(value); }
  function stop(message) {
    serial++;
    current=null;
    utterance=null;
    audio.onplaying=audio.onended=audio.onerror=audio.onwaiting=null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if(window.speechSynthesis)window.speechSynthesis.cancel();
    status.active=false;status.playing=false;status.loading=false;status.error='';status.message=message || '';duck(false);publish();
  }
  function finish(message,error) {
    status.active=false;status.playing=false;status.loading=false;status.message=message;status.error=error || '';current=null;utterance=null;duck(false);publish();
  }
  function playRecorded(url,label) {
    stop();
    if(document.hidden || hostIsHidden){finish('Open this screen before starting narration.','blocked');return;}
    var token=serial;
    current={token:token,kind:'recorded'};
    status.active=true;status.kind='recorded';status.label=label || 'Recorded narration';status.loading=true;status.message='Loading '+status.label.toLowerCase()+'…';status.error='';
    audio.volume=volume;
    audio.onplaying=function(){if(!current || current.token!==token)return;status.playing=true;status.loading=false;status.message=status.label+' is playing.';duck(true);publish();};
    audio.onwaiting=function(){if(!current || current.token!==token)return;status.playing=false;status.loading=true;status.message='Buffering narration…';publish();};
    audio.onended=function(){if(!current || current.token!==token)return;finish('Narration finished.');};
    audio.onerror=function(){if(!current || current.token!==token)return;audio.pause();finish('This recording could not load. Retry Listen.','unavailable');};
    audio.src=url;
    publish();
    try {
      var result=audio.play();
      if(result && result.catch)result.catch(function(error){
        if(!current || current.token!==token)return;
        audio.pause();
        if(error && error.name==='NotAllowedError')finish('Press Listen again to allow narration on this device.','blocked');
        else finish('This recording could not play. Retry Listen.','unavailable');
      });
    }catch(ignore){finish('Recorded playback is unavailable on this device.','unavailable');}
  }
  function playSpeech(text,label) {
    stop();
    if(document.hidden || hostIsHidden){finish('Open this screen before starting narration.','blocked');return;}
    status.kind='browser';status.label=label || 'Browser voice for this page';
    if(!window.speechSynthesis || !window.SpeechSynthesisUtterance){finish('Browser voice is unavailable on this device. The written page remains available.','unavailable');return;}
    var token=serial;
    try {
      utterance=new SpeechSynthesisUtterance(text);utterance.rate=0.93;utterance.volume=volume;
      current={token:token,kind:'browser'};status.active=true;status.loading=true;status.message='Requesting browser voice for the visible page…';
      utterance.onstart=function(){if(!current || current.token!==token)return;status.playing=true;status.loading=false;status.message='Browser voice is reading the visible page.';duck(true);publish();};
      utterance.onend=function(){if(!current || current.token!==token)return;finish('Finished reading this page.');};
      utterance.onerror=function(){if(!current || current.token!==token)return;finish('Browser voice could not read this page on this device.','unavailable');};
      publish();window.speechSynthesis.speak(utterance);
    }catch(ignore){finish('Browser voice could not start on this device.','unavailable');}
  }
  function setVolume(value) {volume=Math.max(0,Math.min(1,Number(value) || 0));audio.volume=volume;if(utterance)utterance.volume=volume;publish();}
  function hidden() {if(document.hidden && status.active)stop('Narration stopped while this screen is hidden.');}
  function hostHidden(event) {if(!event.detail || typeof event.detail.hidden!=='boolean')return;hostIsHidden=event.detail.hidden;if(hostIsHidden && status.active)stop('Narration stopped while the app is hidden.');}
  document.addEventListener('visibilitychange',hidden);
  window.addEventListener('varsha-host-visibility',hostHidden);
  window.addEventListener('pagehide',function(){stop();});
  window.VARSHA_NARRATOR={playRecorded:playRecorded,playSpeech:playSpeech,stop:stop,setVolume:setVolume,getStatus:getStatus};
}());
