(function () {
  'use strict';
  var app = document.getElementById('app');
  var apiBase = String(window.VARSHA_API_BASE || '/api/game').replace(/\/+$/, '');
  var overlay = document.getElementById('overlay');
  var feedback = document.getElementById('feedback');
  var state = null;
  var caseData = null;
  var view = 'briefing';
  var selectedAct = 0;
  var playerCount = 2;
  var names = ['Akshay', 'Detective 2', 'Detective 3', 'Detective 4', 'Detective 5', 'Detective 6'];
  var difficulty = 'standard';
  var activePlayer = '';
  var modal = '';
  var reader = null;
  var returnFocus = null;
  var busy = false;
  var pollBusy = false;
  var online = true;
  var feedbackTimer;
  var audioContext = null;
  var rainSource = null;
  var rainGain = null;
  var speechEnabled = false;
  var params = new URLSearchParams(location.search);
  var companion = params.get('companion') === '1';
  var roomFromUrl = (params.get('room') || '').toUpperCase();
  var pendingRender = false;
  var ownPlayerKey = '';
  var saved = storageGet('varsha-names');
  if (saved) { try { var parsed = JSON.parse(saved); if (Array.isArray(parsed)) parsed.forEach(function (n, i) { if (i < 6 && typeof n === 'string') names[i] = n; }); } catch (ignore) {} }
  if (storageGet('varsha-cinema') === '1') document.documentElement.classList.add('cinema');

  function storageGet(key) { try { return localStorage.getItem(key); } catch (ignore) { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); } catch (ignore) {} }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function textValue(value) { return typeof value === 'string' || typeof value === 'number' ? String(value) : ''; }
  function paragraphs(value) {
    if (Array.isArray(value)) return value.map(textValue).filter(Boolean);
    if (typeof value === 'string') return value.split(/\n\s*\n/).filter(function (p) { return p.trim(); });
    return [];
  }
  function prose(value) { return paragraphs(value).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); }
  function button(label, action, extra, cls) { return '<button type="button" data-action="' + esc(action) + '" ' + (extra || '') + ' class="' + (cls || '') + '">' + label + '</button>'; }
  function allDocs() { return state ? state.acts.reduce(function (list, act) { return list.concat(act.documents || []); }, []) : []; }
  function documentById(id) { return allDocs().filter(function (doc) { return doc.id === id; })[0]; }
  function currentAct() { return state.acts[selectedAct] || state.acts[state.actIndex] || state.acts[0]; }
  function myPlayer() { return state && (state.players.filter(function (p) { return p.id === activePlayer; })[0] || state.players[0]); }
  function roleLabel(role) { return String(role || 'Detective').replace(/[_-]/g, ' '); }
  function modeLabel(mode) { return mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Standard'; }
  function fictionFooter() { return '<footer class="footer"><span>THE VARSHA HOUSE FILES · AN ORIGINAL FICTIONAL MYSTERY</span><span>All people, records and events are fictional. Evidence is created for play.</span></footer>'; }
  function notify(message, kind) {
    clearTimeout(feedbackTimer);
    feedback.textContent = message;
    feedback.className = 'feedback' + (kind === 'error' ? ' error' : '');
    feedback.hidden = false;
    feedbackTimer = setTimeout(function () { feedback.hidden = true; }, kind === 'error' ? 9000 : 5500);
  }
  function api(path, body) {
    var options = { headers: { 'Accept': 'application/json' }, cache: 'no-store' };
    if (body) { options.method = 'POST'; options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
    return fetch(apiBase + path, options).then(function (response) {
      return response.json().catch(function () { throw new Error('The case desk could not be reached. Please try again.'); }).then(function (data) {
        if (!response.ok) throw new Error(data.error || 'The case desk could not complete that action.');
        return data;
      });
    });
  }
  function rememberNames() {
    var inputs = app.querySelectorAll('[data-detective-name]');
    for (var i = 0; i < inputs.length; i++) names[Number(inputs[i].getAttribute('data-detective-name'))] = inputs[i].value;
    storageSet('varsha-names', JSON.stringify(names));
  }
  function renderSetup() {
    var resumeCode = storageGet('varsha-room');
    var modes = [ ['gentle','Gentle','More guidance. A little room to breathe.'], ['standard','Standard','Trust the evidence. Work it out together.'], ['expert','Expert','Fewer signposts. Every detail matters.'] ];
    app.innerHTML = '<main class="setup-shell"><section class="setup-hero"><div class="brand">AN EVENING IN THREE ENVELOPES</div><div class="hero-copy"><div class="case-tag">CASE NO. VH–017 / CLOSED CIRCLE</div><h1>Varsha<br>House<em>.</em></h1><span class="eyebrow">A MONSOON MURDER</span><p>A secluded hotel. A night of relentless rain. One death, five people with something to hide. The case is yours to close.</p><div class="hero-meta"><span>1–6 DETECTIVES</span><span>45–75 MINUTES</span><span>ONE SHARED CASE</span></div></div></section><section class="setup-form"><span class="eyebrow">YOUR TABLE IS READY</span><h2>Stay in. Solve something.</h2><p class="intro">Put the case on your TV. Share the reading on your phones. Open each envelope together and follow the paper trail.</p><form id="setup-form"><div class="section-label">01 / WHO IS INVESTIGATING?</div><div class="count-picker" aria-label="Number of detectives">' + [1,2,3,4,5,6].map(function (n) { return button(String(n), 'count', 'data-count="' + n + '" aria-pressed="' + (n === playerCount) + '" aria-label="' + n + ' detective' + (n > 1 ? 's' : '') + '"', n === playerCount ? 'selected' : ''); }).join('') + '</div><div class="names-grid">' + names.slice(0, playerCount).map(function (name, i) { return '<div><label for="name-' + i + '">Detective ' + (i+1) + '</label><input id="name-' + i + '" data-detective-name="' + i + '" value="' + esc(name) + '" maxlength="30" autocomplete="off" required></div>'; }).join('') + '</div><div class="section-label">02 / CHOOSE YOUR CHALLENGE</div><div class="mode-picker">' + modes.map(function (mode) { return button('<strong>' + mode[1] + '</strong><span>' + esc(mode[2]) + '</span>', 'difficulty', 'data-mode="' + mode[0] + '" aria-pressed="' + (difficulty === mode[0]) + '"', 'mode ' + (difficulty === mode[0] ? 'selected' : '')); }).join('') + '</div><button class="primary start-button" type="submit">Break the first seal <span aria-hidden="true">→</span></button></form><div class="section-label">ALREADY HAVE A CASE?</div><form id="join-form" class="join-line"><label class="visually-hidden" for="join-code" hidden>Room code</label><input id="join-code" aria-label="Room code" placeholder="ROOM CODE" maxlength="12" autocapitalize="characters" autocomplete="off" required><button type="submit">Join room</button></form>' + (resumeCode ? button('Resume case ' + esc(resumeCode) + ' →', 'resume-room', 'data-room="' + esc(resumeCode) + '"', 'text small') : '') + '<div class="setup-foot">Your room saves automatically.<br>Fictional case · No real crime imagery · Best with the sound of rain.</div></section></main>';
  }
  function elapsedLabel() {
    if (!state) return '00:00';
    var secs = Math.max(0, Number(state.elapsedSeconds) || 0);
    return String(Math.floor(secs / 60)).padStart(2,'0') + ':' + String(secs % 60).padStart(2,'0') + (state.paused ? ' · PAUSED' : '');
  }
  function renderHeader() {
    return '<header class="app-header"><div class="wordmark">Varsha House<span>A MONSOON MURDER</span></div>' + button('<span class="connection ' + (online ? '' : 'offline') + '"></span>ROOM ' + esc(state.code), 'share', '', 'room-chip') + '<div class="header-actions"><span class="clock" id="case-clock">' + elapsedLabel() + '</span>' + button(companion ? 'Detective' : 'Phones', 'share', '', 'small') + button('Settings', 'settings', '', 'small') + '</div></header>';
  }
  function renderTrack() {
    var previews = caseData.actPreviews || [];
    return '<div class="act-track" aria-label="Case envelopes">' + [0,1,2].map(function (i) {
      var unlocked = i <= state.actIndex;
      var act = state.acts[i] || previews[i] || {};
      return button('<span class="number">0' + (i+1) + '</span><span><span class="act-label">' + (unlocked ? (i < state.actIndex ? 'OPENED' : 'IN PROGRESS') : 'SEALED ENVELOPE') + '</span><span class="act-name">' + esc(act.title || 'Envelope ' + (i+1)) + '</span></span>', 'act', 'data-act="' + i + '" ' + (!unlocked ? 'disabled' : '') + ' aria-pressed="' + (selectedAct === i) + '"', 'act-step ' + (selectedAct === i ? 'active' : ''));
    }).join('') + '</div>';
  }
  function renderTabs() {
    var tabs = [['briefing','The case'],['files','Case files'],['deductions','Deductions'],['suspects','Suspects'],['board','Pinboard'],['notes','Notebook']];
    if (state.readyToAccuse || state.solved || state.revealed) tabs.push(['accuse', state.solved || state.revealed ? 'Resolution' : 'Charge sheet']);
    return '<nav class="tabs" aria-label="Case desk sections">' + tabs.map(function (tab) { return button(esc(tab[1]), 'view', 'data-view="' + tab[0] + '" aria-current="' + (view === tab[0] ? 'page' : 'false') + '"', 'tab ' + (view === tab[0] ? 'active' : '')); }).join('') + '</nav>';
  }
  function renderSidebar() {
    var act = state.acts[state.actIndex];
    var docs = act.documents || [];
    var read = docs.filter(function (d) { return state.readIds.indexOf(d.id) >= 0; }).length;
    var questions = act.questions || [];
    var solved = questions.filter(function (q) { return state.questionStatus[q.id]; }).length;
    var pct = Math.round((read + solved) / Math.max(1, docs.length + questions.length) * 100);
    return '<aside class="sidebar"><span class="eyebrow">ENVELOPE 0' + (state.actIndex + 1) + '</span><h3>Follow the paper trail.</h3><div class="progress-line"><span>Documents read</span><strong>' + read + ' / ' + docs.length + '</strong></div><div class="progress-line"><span>Deductions made</span><strong>' + solved + ' / ' + questions.length + '</strong></div><div class="progress-bar" aria-label="Envelope progress ' + pct + ' percent"><span style="width:' + pct + '%"></span></div><div class="sidebar-actions">' + (state.actIndex < 2 ? button(state.canAdvance ? 'Open envelope 0' + (state.actIndex+2) + ' →' : 'Next envelope is sealed', 'advance', state.canAdvance ? '' : 'disabled', state.canAdvance ? 'primary' : '') : button(state.readyToAccuse ? 'Prepare the charge sheet →' : 'Finish the deductions', 'view', 'data-view="' + (state.readyToAccuse ? 'accuse' : 'deductions') + '"', state.readyToAccuse ? 'primary' : '')) + button('A nudge, if you need it', 'hints') + '</div><p class="caption" style="margin-top:18px">Read every document and resolve the deductions to break the next seal. You can return to earlier evidence at any time.</p><hr><span class="eyebrow">' + esc(modeLabel(state.difficulty)) + ' CASE</span><p class="caption">Same case. Your own pace. Talk through what each document proves before choosing an answer.</p></aside>';
  }
  function renderBriefing() {
    var meta = caseData.metadata || {};
    var victim = caseData.victim || {};
    var heading = victim.name ? 'The death of ' + victim.name : 'A death at Varsha House';
    var briefing = meta.briefing || 'The roads are closed. The people inside Varsha House are waiting. Read the first envelope, question the story, and establish what happened.';
    var how = meta.howToPlay;
    return '<section><div class="brief-banner"><div class="brief-image" role="img" aria-label="Atmospheric crime scene at Varsha House"></div><div class="brief-copy"><span class="eyebrow">YOUR INVESTIGATION BEGINS HERE</span><h2>' + esc(heading) + '</h2>' + prose(victim.description || victim.summary || 'Five suspects. Three sealed envelopes. The truth is somewhere in the records.') + '</div></div><div class="brief-text"><span class="eyebrow">THE BRIEFING</span>' + prose(briefing) + '<hr><h3>Make an evening of it.</h3>' + (how ? (Array.isArray(how) ? '<ol class="instruction-list">' + how.map(function (item) { return '<li>' + esc(textValue(item)) + '</li>'; }).join('') + '</ol>' : prose(how)) : '<ol class="instruction-list"><li>Read your assigned documents aloud, or join the room on your phones and divide the reading.</li><li>Pin anything that matters. Keep a shared notebook of contradictions and possible explanations.</li><li>Resolve each envelope’s deductions together. The next envelope opens when the table is ready.</li><li>Build a final charge sheet supported by at least three pieces of evidence.</li></ol>') + button('Examine envelope 0' + (selectedAct + 1) + ' →', 'view', 'data-view="files"', 'primary') + '</div></section>';
  }
  function docCard(doc) {
    var read = state.readIds.indexOf(doc.id) >= 0;
    var pinned = state.pins.indexOf(doc.id) >= 0;
    return '<article class="document-card ' + (pinned ? 'pinned' : '') + '"><button type="button" class="document-main" data-action="read" data-doc="' + esc(doc.id) + '"><span class="eyebrow">' + esc(doc.type || 'CASE RECORD') + '</span><h3>' + esc(doc.title) + '</h3><p>' + esc(doc.subtitle || '') + '</p><span class="document-id">' + esc(doc.id) + '</span></button><div class="document-tail"><span class="' + (read ? 'read-status' : '') + '">' + (read ? '✓ READ' : 'UNREAD') + (doc.ownerRole ? ' · ' + esc(roleLabel(doc.ownerRole)) : '') + '</span>' + button(pinned ? 'Unpin' : 'Pin +', 'pin', 'data-doc="' + esc(doc.id) + '" aria-pressed="' + pinned + '"') + '</div></article>';
  }
  function renderFiles() {
    var act = currentAct();
    return '<section><div class="content-heading"><div><span class="eyebrow">ENVELOPE 0' + (selectedAct+1) + ' / CASE MATERIALS</span><h2>' + esc(act.title) + '</h2><p class="caption">' + esc(act.summary || '') + '</p></div>' + button('Print files', 'print', '', 'small') + '</div><div class="doc-grid">' + (act.documents || []).map(docCard).join('') + '</div><p class="caption" style="margin-top:22px">Open each record to read it. The final page lets you mark it read. Suggested roles help divide the reading; every detective can open every document.</p></section>';
  }
  function renderDeductions() {
    var act = currentAct();
    return '<section><div class="content-heading"><div><span class="eyebrow">ENVELOPE 0' + (selectedAct+1) + ' / ESTABLISH THE FACTS</span><h2>What does the evidence prove?</h2><p class="caption">Discuss first. A wrong answer gives nothing away.</p></div></div>' + (act.questions || []).map(function (q, i) {
      var solved = !!state.questionStatus[q.id];
      return '<article class="deduction ' + (solved ? 'solved' : '') + '"><span class="eyebrow">DEDUCTION 0' + (i+1) + ' · ' + esc(q.id) + '</span><h3>' + esc(q.prompt) + '</h3>' + (solved ? '<div class="solved-label">✓ ESTABLISHED BY THE TABLE</div>' : '<div class="answer-options">' + (q.options || []).map(function (option) { return button(esc(option.label), 'answer', 'data-question="' + esc(q.id) + '" data-option="' + esc(option.id) + '"'); }).join('') + '</div>') + '</article>';
    }).join('') + '</section>';
  }
  function portraitPosition(person, index) {
    var name = String(person.name || '').toLowerCase();
    var order = ['meera','kavya','rohan','isha','dev','nikhil'];
    var found = -1;
    for (var i=0;i<order.length;i++) if (name.indexOf(order[i]) >= 0) found = i;
    var pos = found >= 0 ? found : index;
    return (pos % 3 * 50) + '% ' + (pos >= 3 ? 100 : 0) + '%';
  }
  function renderSuspects() {
    return '<section><div class="content-heading"><div><span class="eyebrow">THE PEOPLE IN THE HOUSE</span><h2>Everyone has a version.</h2><p class="caption">Let the records test their stories. Portraits are atmospheric illustrations.</p></div></div><div class="suspect-grid">' + (caseData.suspects || []).map(function (person, i) {
      return '<article class="suspect-card"><div class="portrait" role="img" aria-label="Illustrated portrait of ' + esc(person.name) + '" style="background-position:' + portraitPosition(person, i) + '"></div><div class="suspect-body"><span class="eyebrow">' + esc(person.role || person.occupation || 'PERSON OF INTEREST') + '</span><h3>' + esc(person.name) + '</h3>' + prose(person.description || person.bio || person.summary) + (person.statement ? '<p>“' + esc(person.statement) + '”</p>' : '') + '</div></article>';
    }).join('') + '</div></section>';
  }
  function renderBoard() {
    var docs = allDocs().filter(function (d) { return state.pins.indexOf(d.id) >= 0; });
    return '<section><div class="content-heading"><div><span class="eyebrow">THE SHARED PINBOARD</span><h2>Keep the important things close.</h2><p class="caption">Pinned records sync to every detective’s screen.</p></div></div>' + (docs.length ? '<div class="doc-grid">' + docs.map(docCard).join('') + '</div>' : '<div class="empty-state"><span class="eyebrow">NO RECORDS PINNED YET</span><h3>A thread starts with a detail.</h3><p>Use “Pin +” on a case file to keep it here.</p></div>') + '</section>';
  }
  function renderNotes() {
    var mine = myPlayer();
    return '<section><div class="content-heading"><div><span class="eyebrow">THE TABLE’S WORKING THEORY</span><h2>Put it in the notebook.</h2><p class="caption">Shared observations, contradictions, and things to come back to.</p></div></div><div class="notes-layout"><form class="note-form" id="note-form"><label for="note-player">Writing as</label><select id="note-player">' + state.players.map(function (p) { return '<option value="' + esc(p.id) + '" ' + (mine && mine.id === p.id ? 'selected' : '') + '>' + esc(p.name) + ' · ' + esc(roleLabel(p.role)) + '</option>'; }).join('') + '</select><label for="note-text" style="margin-top:18px">Your observation</label><textarea id="note-text" maxlength="2000" placeholder="Which fact does not fit? What would explain it?" required></textarea><button type="submit" class="primary">Add to shared notebook</button></form><div aria-live="off">' + (state.notes.length ? state.notes.slice().reverse().map(function (note) { var player = state.players.filter(function (p) { return p.id === note.playerId; })[0]; return '<article class="note-card"><span class="eyebrow">' + esc(player ? player.name : 'Detective') + '</span><p>' + esc(note.text) + '</p><time>' + esc(note.at ? new Date(note.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '') + '</time></article>'; }).join('') : '<div class="empty-state"><h3>A fresh page.</h3><p>Your table’s first theory belongs here.</p></div>') + '</div></div></section>';
  }
  function optionHtml(options, placeholder) {
    return '<option value="">' + esc(placeholder) + '</option>' + (options || []).map(function (option) { return '<option value="' + esc(option.id) + '">' + esc(option.label || option.name) + '</option>'; }).join('');
  }
  function renderAccuse() {
    if ((state.solved || state.revealed) && state.reveal) return renderReveal();
    if (!state.readyToAccuse) return '<div class="empty-state"><h3>The charge sheet is still sealed.</h3><p>Finish reading and resolve all three envelopes before submitting a case.</p></div>';
    return '<section><div class="content-heading"><div><span class="eyebrow">THE FINAL CHARGE SHEET</span><h2>A theory is not enough.</h2><p class="caption">Name the person, the method and the motive. Then show your evidence.</p></div></div>' + (state.solved ? '<div class="deduction solved"><span class="solved-label">✓ YOUR CASE IS SUPPORTED</span><p>The evidence supports your charge sheet.</p>' + button('Read the resolution', 'confirm-reveal', '', 'primary') + '</div>' : '') + '<form id="accuse-form" class="accuse-layout"><div class="charge-sheet"><span class="eyebrow">VARSHA HOUSE / INVESTIGATIVE RECORD</span><h3>Statement of accusation</h3><p>Submit one coherent explanation of the death. An unsupported charge will return to your table for reconsideration.</p><label for="killer">The person responsible</label><select id="killer" required>' + optionHtml((caseData.suspects || []).map(function (p) { return {id:p.id,label:p.name}; }), 'Choose a suspect') + '</select><label for="method">The method</label><select id="method" required>' + optionHtml(caseData.methodOptions, 'Choose the method') + '</select><label for="motive">The motive</label><select id="motive" required>' + optionHtml(caseData.motiveOptions, 'Choose the motive') + '</select><button type="submit" class="primary">Submit the charge sheet</button><p class="caption" style="color:#626c59;margin:18px 0 0">A fictional case record for play. No real allegation is made.</p></div><div class="accuse-context"><span class="eyebrow">CITE YOUR CASE FILES</span><h3>At least three pieces of evidence.</h3><p class="caption">Choose records that support your explanation, rather than every record you have read.</p><div class="citation-list">' + allDocs().map(function (doc) { return '<label class="citation"><input type="checkbox" name="evidence" value="' + esc(doc.id) + '"><span><strong>' + esc(doc.id) + '</strong>' + esc(doc.title) + '</span></label>'; }).join('') + '</div><p class="caption" id="citation-count" style="margin-top:15px">0 evidence citations selected</p>' + button('Reopen the pinboard', 'view', 'data-view="board"', 'text small') + '<hr><p class="caption">Stuck after the full investigation? You can deliberately end the case and read its resolution.</p>' + button('End case & reveal…', 'confirm-reveal', '', 'small danger') + '</div></form></section>';
  }
  function renderReveal() {
    var reveal = state.reveal;
    var herrings = reveal.redHerrings;
    var herringHtml = Array.isArray(herrings) ? herrings.map(function (herring) {
      if (typeof herring === 'string') return prose(herring);
      if (!herring || typeof herring !== 'object') return '';
      var suspect=(caseData.suspects || []).filter(function(person){return person.id===herring.suspectId;})[0];
      return (suspect ? '<h3>'+esc(suspect.name)+'</h3>' : '') + prose(herring.explanation);
    }).join('') : prose(herrings);
    return '<article class="revealed"><span class="eyebrow">' + (state.solved ? 'CASE SOLVED / EVIDENCE SUPPORTED' : 'CASE REVEALED / THE RESOLUTION') + '</span><h2>' + esc(reveal.title || 'The truth at Varsha House') + '</h2>' + prose(reveal.summary) + prose(reveal.paragraphs) + (herringHtml ? '<hr><h3>The threads that led elsewhere</h3>' + herringHtml : '') + '<div class="reveal-footer">The investigation is complete. Your case files and shared notes remain available to revisit.<br>Thank you for spending an evening at Varsha House.</div></article>';
  }
  function renderGame() {
    if (!state) return;
    var focus = document.activeElement;
    var focusId = focus && focus.id;
    var fields = Array.prototype.slice.call(app.querySelectorAll('input,textarea,select')).map(function (field) { return {id:field.id,name:field.name,value:field.value,checked:field.checked}; });
    var focusKey = focus && focus.dataset ? [focus.dataset.action, focus.dataset.doc, focus.dataset.view, focus.dataset.question, focus.dataset.option, focus.dataset.act].join('|') : '';
    var scrollY = window.scrollY;
    var player = myPlayer();
    var content = {briefing:renderBriefing,files:renderFiles,deductions:renderDeductions,suspects:renderSuspects,board:renderBoard,notes:renderNotes,accuse:renderAccuse};
    app.innerHTML = renderHeader() + '<main class="desk"><div class="case-top"><div><span class="eyebrow">AN INVESTIGATION IN THREE ENVELOPES</span><h1>' + ((state.solved || state.revealed) ? 'The house has given up its secrets.' : 'The storm has closed the road.') + '</h1><p>' + ((state.solved || state.revealed) ? 'Your records remain open for one last look.' : 'Read closely. Talk it through. Build the case together.') + '</p></div><div class="detective-pill">' + (companion ? 'COMPANION DESK<br>' : 'AT THE TABLE<br>') + esc(player ? player.name : '') + '<br>' + esc(player ? roleLabel(player.role) : '') + '</div></div>' + renderTrack() + renderTabs() + (companion ? '<div class="phone-control-note">You are in room <strong>' + esc(state.code) + '</strong>. Reading, pins, notes and deductions are shared. Your page and scroll stay private.</div>' : '') + '<div class="desk-grid"><div id="desk-content">' + (content[view] || renderBriefing)() + '</div>' + renderSidebar() + '</div></main>' + fictionFooter();
    fields.forEach(function (field) {
      var restored = field.id ? document.getElementById(field.id) : null;
      if (!restored && field.name === 'evidence') { var checks=app.querySelectorAll('input[name=evidence]'); for(var c=0;c<checks.length;c++) if(checks[c].value===field.value)restored=checks[c]; }
      if (restored) { if(restored.type === 'checkbox')restored.checked=field.checked;else restored.value=field.value; }
    });
    var citationCount=document.getElementById('citation-count');
    if(citationCount) { var checkedCount=app.querySelectorAll('input[name=evidence]:checked').length;citationCount.textContent=checkedCount+' evidence citation'+(checkedCount===1?'':'s')+' selected'; }
    if(focusId && document.getElementById(focusId))document.getElementById(focusId).focus({preventScroll:true});
    if (focusKey && focusKey !== '|||||') {
      var candidates = app.querySelectorAll('[data-action]');
      for (var i=0;i<candidates.length;i++) { var d = candidates[i].dataset; if ([d.action,d.doc,d.view,d.question,d.option,d.act].join('|') === focusKey) { candidates[i].focus({preventScroll:true}); break; } }
    }
    window.scrollTo(0, scrollY);
    pendingRender = false;
  }
  function applyState(data, force) {
    var changed = !state || data.revision !== state.revision;
    state = data;
    state.acts = state.acts || [];
    state.players = state.players || [];
    state.readIds = state.readIds || [];
    state.pins = state.pins || [];
    state.notes = state.notes || [];
    state.hints = state.hints || [];
    state.questionStatus = state.questionStatus || {};
    caseData = data.case || caseData;
    if (selectedAct > state.actIndex) selectedAct = state.actIndex;
    var clock = document.getElementById('case-clock');
    if (clock) clock.textContent = elapsedLabel();
    var editing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (!changed && !force && !pendingRender) return;
    if (modal || editing) { pendingRender = true; return; }
    renderGame();
  }
  function perform(action, after) {
    if (busy || !state) return Promise.resolve(null);
    busy = true;
    return api('/' + encodeURIComponent(state.code), action).then(function (data) {
      applyState(data, true);
      if (data.feedback) notify(data.feedback.message, data.feedback.kind);
      if (after) after(data);
      return data;
    }).catch(function (error) { notify(error.message, 'error'); return null; }).then(function (result) { busy = false; return result; });
  }
  function activateRoom(data) {
    state = null;
    caseData = data.case || caseData;
    selectedAct = data.actIndex || 0;
    storageSet('varsha-room', data.code);
    ownPlayerKey = 'varsha-player-' + data.code;
    activePlayer = storageGet(ownPlayerKey) || '';
    history.replaceState(null, '', location.pathname + '?room=' + encodeURIComponent(data.code) + (companion ? '&companion=1' : ''));
    applyState(data, true);
    if (companion && !data.players.some(function (p) { return p.id === activePlayer; })) showPlayers();
  }
  function joinRoom(code) {
    code = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,12}$/.test(code)) { notify('Enter the room code shown on your case screen.', 'error'); return; }
    if (busy) return;
    busy = true;
    api('/' + encodeURIComponent(code)).then(activateRoom).catch(function (error) { notify(error.message, 'error'); if (!state) renderSetup(); }).then(function () { busy = false; });
  }
  function showModal(name, html, options) {
    options = options || {};
    if (!modal) returnFocus = document.activeElement;
    modal = name;
    overlay.hidden = false;
    overlay.innerHTML = '<section role="dialog" aria-modal="true" aria-label="' + esc(options.title || 'Case desk dialog') + '" class="dialog ' + (options.reader ? 'reader' : '') + '">' + html + '</section>';
    document.body.style.overflow = 'hidden';
    var first = overlay.querySelector('[autofocus]') || overlay.querySelector('button,input,select,textarea');
    if (first) first.focus();
  }
  function closeModal() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    overlay.hidden = true;
    overlay.innerHTML = '';
    modal = '';
    reader = null;
    document.body.style.overflow = '';
    if (pendingRender && state) renderGame();
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus({preventScroll:true});
    else if (state) { var buttonEl = app.querySelector('[data-action="view"][data-view="' + view + '"]'); if (buttonEl) buttonEl.focus({preventScroll:true}); }
  }
  function dialogTop(title) { return '<div class="dialog-header"><div><span class="eyebrow">THE VARSHA HOUSE FILES</span><h2>' + esc(title) + '</h2></div>' + button('Close', 'close', '', 'dialog-close') + '</div>'; }
  function showShare() {
    var url = location.origin + location.pathname + '?room=' + encodeURIComponent(state.code) + '&companion=1';
    showModal('share', dialogTop('Bring your own reading room.') + '<p>On another device, open the companion link below. Choose a detective and share the evidence while the case stays on your TV.</p><div class="share-code">' + esc(state.code) + '</div><p class="caption">Or open this site on your phone and enter the room code.</p><div class="copy-url">' + esc(url) + '</div><div class="dialog-actions">' + button('Choose my detective', 'players') + button('Copy companion link', 'copy', 'data-url="' + esc(url) + '"', 'primary') + '</div>', {title:'Join this room'});
  }
  function showPlayers() {
    showModal('players', dialogTop('Which detective are you?') + '<p>Pick your place at the table. Roles suggest how to divide the reading; everyone can examine every record.</p><div class="role-options">' + state.players.map(function (p) { return button('<strong>' + esc(p.name) + '</strong><span>' + esc(roleLabel(p.role)) + (activePlayer === p.id ? ' · SELECTED' : '') + '</span>', 'select-player', 'data-player="' + esc(p.id) + '"'); }).join('') + '</div>', {title:'Choose detective'});
  }
  function splitPages(body) {
    var blocks = paragraphs(body);
    var pages = [];
    var page = '';
    var max = document.documentElement.classList.contains('cinema') ? 540 : 820;
    blocks.forEach(function (block) {
      var rest = block;
      while (rest.length) {
        var available = max - page.length;
        if (rest.length <= available) { page += (page ? '\n\n' : '') + rest; rest = ''; }
        else if (page) { pages.push(page); page = ''; }
        else {
          var split = rest.lastIndexOf(' ', max);
          if (split < max/2) split = max;
          else split += 1;
          pages.push(rest.slice(0, split));
          rest = rest.slice(split);
        }
      }
    });
    if (page) pages.push(page);
    return pages.length ? pages : [''];
  }
  function openReader(id) {
    var doc = documentById(id);
    if (!doc) return;
    reader = {doc:doc,pages:splitPages(doc.body),page:0};
    drawReader();
  }
  function speakPage() {
    if (!speechEnabled || !window.speechSynthesis || !reader) return;
    window.speechSynthesis.cancel();
    try { var utterance = new SpeechSynthesisUtterance(reader.pages[reader.page]); utterance.rate = 0.93; window.speechSynthesis.speak(utterance); } catch (ignore) { notify('Narration is not available in this browser.', 'info'); }
  }
  function drawReader() {
    var doc = reader.doc;
    var last = reader.page === reader.pages.length - 1;
    var pinned = state.pins.indexOf(doc.id) >= 0;
    var asset = doc.asset && /^\/assets\/[a-zA-Z0-9_./-]+$/.test(doc.asset) && doc.asset.indexOf('..') < 0 ? './' + doc.asset.slice(1) : '';
    var html = '<div class="reader-top"><span class="eyebrow">' + esc(doc.id) + ' / ' + esc(doc.type || 'CASE RECORD') + '</span><div>' + button(pinned ? 'Unpin' : 'Pin +', 'reader-pin', 'data-doc="' + esc(doc.id) + '" aria-pressed="' + pinned + '"', 'small') + ' ' + button('Close', 'close', '', 'small') + '</div></div><div class="reader-content" tabindex="0"><span class="stamp">FICTIONAL RECORD · CREATED FOR PLAY</span><h2>' + esc(doc.title) + '</h2>' + (doc.subtitle ? '<div class="reader-subtitle">' + esc(doc.subtitle) + '</div>' : '') + (asset && reader.page === 0 ? '<img class="reader-asset" src="' + esc(asset) + '" alt="Supporting case illustration">' : '') + '<div class="reader-body">' + prose(reader.pages[reader.page]) + '</div></div><div class="reader-bottom">' + button('← Previous', 'reader-prev', reader.page === 0 ? 'disabled' : '') + '<span class="page-count">PAGE ' + (reader.page+1) + ' / ' + reader.pages.length + '</span>' + (last ? button(state.readIds.indexOf(doc.id) >= 0 ? 'Read · Close file' : 'Mark read & close ✓', 'reader-done', 'data-doc="' + esc(doc.id) + '"', 'primary') : button('Next page →', 'reader-next', '', 'primary')) + '</div>';
    showModal('reader', html, {reader:true,title:doc.title});
    var content = overlay.querySelector('.reader-content');
    if (content) { content.scrollTop = 0; content.setAttribute('aria-label','Document text. Use Up and Down to scroll, and Back to close.');content.focus(); }
    speakPage();
  }
  function showHints() {
    var act = state.acts[state.actIndex];
    var hints = state.hints.filter(function (hint) { return hint.actId === act.id; });
    showModal('hints', dialogTop('A little light in the rain.') + '<span class="eyebrow">ENVELOPE 0' + (state.actIndex+1) + ' / ' + esc(modeLabel(state.difficulty)) + '</span><p>Hints are deliberate. Read one, return to the records, and give the table time to think.</p>' + (hints.length ? hints.map(function (hint,i) { return '<div class="hint-card"><span class="eyebrow">NUDGE 0' + (i+1) + '</span>' + prose(hint.text) + '</div>'; }).join('') : '<p class="caption">No hints opened for this envelope.</p>') + '<div class="dialog-actions">' + button('Back to the case', 'close') + button(hints.length ? 'Ask for the next nudge' : 'Open the first nudge', 'next-hint', '', 'primary') + '</div>', {title:'Case hints'});
  }
  function showSettings() {
    var cinema = document.documentElement.classList.contains('cinema');
    showModal('settings', dialogTop('Settle into the evening.') + '<div class="settings-row"><div><strong>Reading scale</strong><p>Larger type and fewer cards for a distant TV.</p></div>' + button(cinema ? 'Cinema' : 'Normal', 'font-scale') + '</div><div class="settings-row"><div><strong>Rain ambience</strong><p>Soft, generated rain. Starts only when you choose.</p></div>' + button(rainSource ? 'On · turn off' : 'Off · turn on', 'rain') + '</div><div class="settings-row"><div><strong>Read documents aloud</strong><p>' + (window.speechSynthesis ? 'Uses your browser’s available voice.' : 'Your browser does not offer narration.') + '</p></div>' + button(speechEnabled ? 'On' : 'Off', 'speech', window.speechSynthesis ? '' : 'disabled') + '</div><div class="settings-row"><div><strong>Case clock</strong><p>Pause the clock for a break. Records stay accessible.</p></div>' + button(state.paused ? 'Resume' : 'Pause', 'pause') + '</div><div class="settings-row"><div><strong>Your place at the table</strong><p>' + esc(myPlayer() ? myPlayer().name : 'Detective') + '</p></div>' + button('Choose', 'players') + '</div><p class="caption" style="margin-top:23px">Music is off. With a TV remote, use the direction keys to move, Enter to choose, and Back to close a document. Reduced motion follows your device setting.</p>' + (state.actIndex === 2 && !state.solved && !state.revealed ? button('End case & reveal…', 'confirm-reveal', '', 'text small') : '') + '<div class="dialog-actions">' + button('Leave this room', 'leave', '', 'danger small') + button('Back to the case', 'close', '', 'primary') + '</div>', {title:'Case settings'});
  }
  function toggleRain() {
    if (rainSource) { rainSource.stop(); rainSource = null; if (audioContext) audioContext.suspend(); showSettings(); return; }
    try {
      var Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) { notify('Rain ambience is not supported by this browser.', 'info'); return; }
      if (!audioContext) audioContext = new Audio();
      audioContext.resume();
      var buffer = audioContext.createBuffer(1, audioContext.sampleRate * 4, audioContext.sampleRate);
      var channel = buffer.getChannelData(0);
      var previous = 0;
      for (var i=0;i<channel.length;i++) { previous = (previous + Math.random() * 0.04 - 0.02) / 1.02; channel[i] = previous * 3.5; }
      rainSource = audioContext.createBufferSource(); rainSource.buffer = buffer; rainSource.loop = true;
      var filter = audioContext.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1700;
      rainGain = audioContext.createGain(); rainGain.gain.value = 0.22;
      rainSource.connect(filter); filter.connect(rainGain); rainGain.connect(audioContext.destination); rainSource.start();
      showSettings();
    } catch (error) { rainSource = null; notify('Rain ambience could not start on this device.', 'info'); }
  }
  function confirmReveal() {
    showModal('reveal-confirm', dialogTop(state.solved ? 'Open the resolution?' : 'End the investigation?') + '<p>' + (state.solved ? 'Your charge sheet is supported. The resolution explains the complete case and its misleading threads.' : 'This opens the full solution for everyone in this room. Return to the evidence if you want to keep investigating.') + '</p><p class="caption">The reveal cannot be put back in its envelope.</p><div class="dialog-actions">' + button('Keep investigating', 'close') + button(state.solved ? 'Read the resolution' : 'Reveal the full solution', 'reveal', '', 'danger') + '</div>', {title:'Confirm case resolution'});
  }
  function printFiles() {
    document.getElementById('print-files').innerHTML = state.acts.map(function (act) { return (act.documents || []).map(function (doc) { return '<article class="print-document"><span class="eyebrow">THE VARSHA HOUSE FILES / ' + esc(act.title) + ' / ' + esc(doc.id) + '</span><h2>' + esc(doc.title) + '</h2><p>' + esc(doc.subtitle || '') + '</p>' + prose(doc.body) + '<div class="fiction">FICTIONAL RECORD. All people, records and events are fictional and created for play.</div></article>'; }).join(''); }).join('');
    window.print();
  }
  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(value).then(function () { notify('Companion link copied. Open it on your phone.'); }).catch(function () { copyFallback(value); }); }
    else copyFallback(value);
  }
  function copyFallback(value) {
    var el = document.createElement('textarea'); el.value = value; overlay.querySelector('.dialog').appendChild(el); el.focus(); el.select();
    try { if (document.execCommand('copy')) { el.remove(); notify('Companion link copied.'); } else notify('Select and copy the link shown in this field.', 'info'); } catch (ignore) { notify('Select and copy the link shown in this field.', 'info'); }
  }
  document.addEventListener('click', function (event) {
    var el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    var action = el.dataset.action;
    if (action === 'count') { rememberNames(); playerCount = Number(el.dataset.count); renderSetup(); }
    else if (action === 'difficulty') { rememberNames(); difficulty = el.dataset.mode; renderSetup(); }
    else if (action === 'resume-room') joinRoom(el.dataset.room);
    else if (action === 'close') closeModal();
    else if (action === 'share') showShare();
    else if (action === 'players') showPlayers();
    else if (action === 'select-player') { activePlayer = el.dataset.player; storageSet(ownPlayerKey, activePlayer); closeModal(); renderGame(); }
    else if (action === 'copy') copyText(el.dataset.url);
    else if (action === 'view') { view = el.dataset.view; renderGame(); window.scrollTo(0,0); var heading = document.getElementById('desk-content'); heading.setAttribute('tabindex','-1'); heading.focus({preventScroll:true}); }
    else if (action === 'act') { selectedAct = Number(el.dataset.act); view = 'files'; renderGame(); }
    else if (action === 'read') openReader(el.dataset.doc);
    else if (action === 'pin') perform({type:'pin',documentId:el.dataset.doc});
    else if (action === 'reader-pin') perform({type:'pin',documentId:el.dataset.doc}, function () { if (reader) drawReader(); });
    else if (action === 'reader-next' && reader) { reader.page++; drawReader(); }
    else if (action === 'reader-prev' && reader) { reader.page--; drawReader(); }
    else if (action === 'reader-done') { var id = el.dataset.doc; closeModal(); if (state.readIds.indexOf(id) < 0) perform({type:'read',documentId:id}); }
    else if (action === 'answer') perform({type:'answer',questionId:el.dataset.question,optionId:el.dataset.option});
    else if (action === 'advance') perform({type:'advance'}, function (data) { selectedAct = data.actIndex; view = 'files'; renderGame(); window.scrollTo(0,0); });
    else if (action === 'hints') showHints();
    else if (action === 'next-hint') perform({type:'hint'}, function () { showHints(); });
    else if (action === 'settings') showSettings();
    else if (action === 'font-scale') { document.documentElement.classList.toggle('cinema'); storageSet('varsha-cinema',document.documentElement.classList.contains('cinema') ? '1' : '0'); pendingRender = true; showSettings(); }
    else if (action === 'rain') toggleRain();
    else if (action === 'speech') { speechEnabled = !speechEnabled; if (!speechEnabled && window.speechSynthesis) window.speechSynthesis.cancel(); showSettings(); }
    else if (action === 'pause') perform({type:state.paused ? 'resume' : 'pause'}, showSettings);
    else if (action === 'print') printFiles();
    else if (action === 'confirm-reveal') confirmReveal();
    else if (action === 'reveal') perform({type:'reveal',confirm:true}, function (data) { if (data.revealed) { view='accuse'; closeModal(); renderGame(); window.scrollTo(0,0); } });
    else if (action === 'leave') { closeModal(); state=null; view='briefing'; companion=false; history.replaceState(null,'',location.pathname); renderSetup(); window.scrollTo(0,0); }
  });
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (['setup-form','join-form','note-form','accuse-form'].indexOf(form.id) < 0) return;
    event.preventDefault();
    if (busy) return;
    if (form.id === 'setup-form') {
      rememberNames(); busy=true;
      var submit = form.querySelector('[type=submit]'); submit.disabled=true; submit.textContent='Preparing your case…';
      api('',{playerCount:playerCount,names:names.slice(0,playerCount).map(function (n,i) { return n.trim() || 'Detective '+(i+1); }),difficulty:difficulty}).then(activateRoom).catch(function (error) { notify(error.message,'error'); renderSetup(); }).then(function () { busy=false; });
    } else if (form.id === 'join-form') joinRoom(document.getElementById('join-code').value);
    else if (form.id === 'note-form') {
      var noteText = document.getElementById('note-text').value.trim();
      if (!noteText) return;
      var playerId = document.getElementById('note-player').value;
      perform({type:'note',playerId:playerId,text:noteText}, function (data) { if (!data.feedback || data.feedback.kind !== 'error') { var input = document.getElementById('note-text'); if(input) input.value=''; pendingRender=false; renderGame(); notify('Observation added to the shared notebook.'); } });
    } else if (form.id === 'accuse-form') {
      var checked = Array.prototype.slice.call(form.querySelectorAll('input[name=evidence]:checked')).map(function (input) { return input.value; });
      if (checked.length < 3) { notify('Support your charge sheet with at least three distinct case files.', 'error'); return; }
      perform({type:'accuse',killerId:document.getElementById('killer').value,methodId:document.getElementById('method').value,motiveId:document.getElementById('motive').value,evidenceIds:checked}, function (data) { if (data.solved || data.revealed) { closeModal(); view='accuse'; renderGame(); window.scrollTo(0,0); } });
    }
  });
  document.addEventListener('change', function (event) {
    if (event.target.name === 'evidence') { var count = document.querySelectorAll('input[name=evidence]:checked').length; var el=document.getElementById('citation-count'); if(el) el.textContent=count+' evidence citation'+(count === 1 ? '' : 's')+' selected'; }
  });
  function focusable(root) {
    return Array.prototype.slice.call(root.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter(function (el) { return el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0; });
  }
  document.addEventListener('keydown', function (event) {
    var active = document.activeElement;
    var editing = /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    if ((event.key === 'Escape' || event.key === 'BrowserBack' || event.keyCode === 10009 || (event.key === 'Backspace' && !editing)) && modal) { event.preventDefault(); closeModal(); return; }
    if (event.key === 'Tab' && modal) {
      var list = focusable(overlay); if(!list.length) return;
      if(event.shiftKey && (active === list[0] || !overlay.contains(active))) {event.preventDefault();list[list.length-1].focus();}
      else if(!event.shiftKey && active === list[list.length-1]) {event.preventDefault();list[0].focus();}
      return;
    }
    if (editing || event.altKey || event.ctrlKey || event.metaKey || ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(event.key) < 0) return;
    if (active && active.classList.contains('reader-content')) {
      event.preventDefault();
      if (event.key === 'ArrowDown') {
        if(active.scrollTop + active.clientHeight < active.scrollHeight - 3)active.scrollTop += Math.max(80,active.clientHeight * 0.5);
        else { var next=overlay.querySelector('.reader-bottom .primary');if(next)next.focus(); }
      } else if (event.key === 'ArrowUp') {
        if(active.scrollTop > 0)active.scrollTop -= Math.max(80,active.clientHeight * 0.5);
        else { var topButton=overlay.querySelector('.reader-top button');if(topButton)topButton.focus(); }
      } else { var pageButton=overlay.querySelector('[data-action="'+(event.key==='ArrowLeft'?'reader-prev':'reader-next')+'"]:not([disabled])');if(pageButton)pageButton.focus(); }
      return;
    }
    var candidates = focusable(modal ? overlay : app);
    if (!candidates.length) return;
    if (candidates.indexOf(active) < 0) { event.preventDefault(); candidates[0].focus(); return; }
    var rect = active.getBoundingClientRect();
    var x = rect.left+rect.width/2; var y=rect.top+rect.height/2;
    var vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    var sign = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    var best=null; var bestScore=Infinity;
    candidates.forEach(function (el) { if(el===active)return;var r=el.getBoundingClientRect();var dx=r.left+r.width/2-x;var dy=r.top+r.height/2-y;var forward=(vertical?dy:dx)*sign;var cross=Math.abs(vertical?dx:dy);if(forward<5)return;var score=forward+cross*2.5+(cross>forward*2?300:0);if(score<bestScore){bestScore=score;best=el;} });
    if(best){event.preventDefault();best.focus();best.scrollIntoView({block:'nearest',inline:'nearest'});}
  });
  function poll() {
    if (!state || document.hidden || pollBusy || busy) return;
    pollBusy=true;
    var code=state.code;
    api('/'+encodeURIComponent(code)).then(function (data) { if(!state||state.code!==code)return;online=true;applyState(data,false);var dots=document.querySelectorAll('.connection');for(var i=0;i<dots.length;i++)dots[i].classList.remove('offline'); }).catch(function () {online=false;var dots=document.querySelectorAll('.connection');for(var i=0;i<dots.length;i++)dots[i].classList.add('offline');}).then(function(){pollBusy=false;});
  }
  document.addEventListener('visibilitychange',function(){if(!document.hidden)poll();});
  setInterval(poll,3000);
  api('').then(function (data) { caseData=data; if(roomFromUrl)joinRoom(roomFromUrl);else renderSetup(); }).catch(function (error) { renderSetup();notify(error.message,'error'); });
}());
