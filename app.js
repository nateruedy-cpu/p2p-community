const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================================
// EDIT THESE TWO ARRAYS FREELY — nothing else in the file needs to change.
// =========================================================================

// Daily check-in items. Add/remove/rename items any time.
// type: 'boolean' = simple checkbox. 'counter' = tap +/- to hit a daily target (e.g. cold DMs sent).
// clientsOnly: true = item only shows for members who've marked "I coach clients" on.
const CHECKLIST_ITEMS = [
  { id: 'trained',         label: 'Trained today',                                              type: 'boolean' },
  { id: 'nutrition',       label: 'Hit my nutrition target',                                     type: 'boolean' },
  { id: 'mindset',         label: 'Did something for my mindset (prayer, journaling, reading)',  type: 'boolean' },
  { id: 'posted_ig',       label: 'Posted on Instagram',                                         type: 'boolean' },
  { id: 'posted_youtube',  label: 'Posted on YouTube',                                           type: 'boolean' },
  { id: 'posted_tiktok',   label: 'Posted on TikTok',                                             type: 'boolean' },
  { id: 'cold_dms',        label: 'Sent cold DMs',              type: 'counter', target: 10 },
  { id: 'client_checkins', label: 'Checked in with clients',    type: 'counter', target: 1, clientsOnly: true },
];

// Streak levels. "min" is the streak length (in days) required to reach that level.
const LEVELS = [
  { name: 'Rookie',      min: 0 },
  { name: 'Grinder',     min: 3 },
  { name: 'Operator',    min: 7 },
  { name: 'Disciplined', min: 14 },
  { name: 'Iron Will',   min: 30 },
  { name: 'Elite',       min: 60 },
  { name: 'Legend',      min: 100 },
];

// =========================================================================

const CHANNEL_CONFIG = {
  wins:          { badge: 'WIN NO.',          reactions: ['🔥', '💪', '🏆'] },
  board:         { badge: 'POST NO.',         reactions: ['👍', '🔥', '😂'] },
  announcements: { badge: 'ANNOUNCEMENT NO.', reactions: ['👍', '🔥', '🏆'] },
};

let isSignUp = false;
let currentUser = null;
let currentProfile = null;
const expandedComments = new Set();
let replyingTo = null; // { id, authorName, snippet }

// ---------- DOM refs ----------
const authShell = document.getElementById('auth-shell');
const appShell = document.getElementById('app-shell');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');
const nameField = document.getElementById('name-field');
const nameInput = document.getElementById('name-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authSubmit = document.getElementById('auth-submit');
const toggleBtn = document.getElementById('toggle-btn');
const toggleText = document.getElementById('toggle-text');
const currentMemberEl = document.getElementById('current-member');
const signoutBtn = document.getElementById('signout-btn');
const sidenav = document.getElementById('sidenav');
const mobileNavToggle = document.getElementById('mobile-nav-toggle');

// ================= AUTH =================
toggleBtn.addEventListener('click', () => {
  isSignUp = !isSignUp;
  nameField.classList.toggle('hidden', !isSignUp);
  authSubmit.textContent = isSignUp ? 'Create Account' : 'Sign In';
  toggleText.textContent = isSignUp ? 'Already a member?' : 'New here?';
  toggleBtn.textContent = isSignUp ? 'Sign in' : 'Create an account';
  authError.classList.add('hidden');
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  authSubmit.disabled = true;
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    if (isSignUp) {
      const name = nameInput.value.trim();
      if (!name) throw new Error('Enter your name.');
      const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { name } } });
      if (error) throw error;
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        showAuthError('Account created. Check your email to confirm, then sign in.');
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    showAuthError(err.message || 'Something went wrong.');
  } finally {
    authSubmit.disabled = false;
  }
});

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove('hidden');
}

signoutBtn.addEventListener('click', async () => { await supabaseClient.auth.signOut(); });

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    enterApp(session.user);
  } else {
    currentUser = null;
    currentProfile = null;
    appShell.classList.add('hidden');
    authShell.classList.remove('hidden');
  }
});

async function enterApp(user) {
  currentUser = user;
  authShell.classList.add('hidden');
  appShell.classList.remove('hidden');

  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
  currentProfile = profile;
  currentMemberEl.textContent = profile ? profile.name : user.email;

  document.getElementById('composer-announcements').classList.toggle(
    'hidden', !(currentProfile && (currentProfile.can_announce || currentProfile.is_admin))
  );

  initNav();
  initComposers();
  initChat();
  initCheckin();

  loadChannel('wins');
  loadChannel('board');
  loadChannel('announcements');
  loadChat();
  subscribeRealtime();
}

// ================= NAV =================
function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  mobileNavToggle.addEventListener('click', () => sidenav.classList.toggle('open'));
}

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  sidenav.classList.remove('open');
  if (view === 'chat') {
    const box = document.getElementById('chat-messages');
    box.scrollTop = box.scrollHeight;
  }
}

// ================= POSTS (wins / board / announcements) =================
function initComposers() {
  ['wins', 'board', 'announcements'].forEach(channel => {
    const composer = document.getElementById(`composer-${channel}`);
    const textarea = composer.querySelector('textarea');
    const countEl = composer.querySelector('.char-count');
    const postBtn = composer.querySelector('.btn-post');

    textarea.addEventListener('input', () => {
      countEl.textContent = `${textarea.value.length} / 2000`;
    });

    postBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (!content) return;
      postBtn.disabled = true;
      const { error } = await supabaseClient.from('posts').insert({ user_id: currentUser.id, channel, content });
      postBtn.disabled = false;
      if (error) { alert('Could not post: ' + error.message); return; }
      textarea.value = '';
      countEl.textContent = '0 / 2000';
      loadChannel(channel);
    });
  });
}

async function loadChannel(channel) {
  const { data: posts, error } = await supabaseClient
    .from('posts')
    .select('id, content, created_at, user_id, profiles(name)')
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(150);

  const feedEl = document.getElementById(`feed-${channel}`);
  if (error) { feedEl.innerHTML = `<div class="empty-state">Couldn't load. ${error.message}</div>`; return; }
  if (!posts.length) {
    feedEl.innerHTML = `<div class="empty-state">Nothing here yet.<br>Be the first to post.</div>`;
    return;
  }

  const postIds = posts.map(p => p.id);
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabaseClient.from('reactions').select('post_id, user_id, emoji').in('post_id', postIds),
    supabaseClient.from('comments').select('id, post_id, user_id, content, created_at, profiles(name)').in('post_id', postIds).order('created_at', { ascending: true }),
  ]);

  renderChannel(channel, posts, reactions || [], comments || []);
}

function renderChannel(channel, posts, reactions, comments) {
  const cfg = CHANNEL_CONFIG[channel];
  const feedEl = document.getElementById(`feed-${channel}`);
  const total = posts.length;

  feedEl.innerHTML = posts.map((post, idx) => {
    const num = String(total - idx).padStart(3, '0');
    const authorName = post.profiles ? post.profiles.name : 'Member';
    const time = formatTime(post.created_at);
    const postReactions = reactions.filter(r => r.post_id === post.id);
    const postComments = comments.filter(c => c.post_id === post.id);
    const expanded = expandedComments.has(post.id);

    const reactionButtons = cfg.reactions.map(emoji => {
      const matches = postReactions.filter(r => r.emoji === emoji);
      const active = matches.some(r => r.user_id === currentUser.id);
      return `<button class="reaction-btn ${active ? 'active' : ''}" data-post="${post.id}" data-emoji="${emoji}">
        <span>${emoji}</span><span>${matches.length > 0 ? matches.length : ''}</span>
      </button>`;
    }).join('');

    const commentsHtml = expanded ? `
      <div class="comments-block">
        ${postComments.map(c => `
          <div class="comment-row">
            <span class="comment-author">${escapeHtml(c.profiles ? c.profiles.name : 'Member')}:</span>
            <span class="comment-text">${escapeHtml(c.content)}</span>
          </div>
        `).join('') || '<div class="comment-text">No comments yet.</div>'}
        <div class="comment-input-row">
          <input type="text" placeholder="Write a comment..." data-comment-input="${post.id}" maxlength="1000" />
          <button class="comment-send" data-comment-send="${post.id}">Send</button>
        </div>
      </div>
    ` : '';

    return `
      <div class="post-card">
        <div class="post-meta">
          <div>
            <span class="post-author">${escapeHtml(authorName)}</span>
            <div class="post-badge">${cfg.badge} ${num}</div>
          </div>
          <span class="post-time">${time}</span>
        </div>
        <div class="post-content">${linkify(escapeHtml(post.content))}</div>
        <div class="post-actions">
          ${reactionButtons}
          <button class="comment-toggle" data-comment-toggle="${post.id}">Comments (${postComments.length})</button>
        </div>
        ${commentsHtml}
      </div>
    `;
  }).join('');

  feedEl.querySelectorAll('[data-post]').forEach(btn => {
    btn.addEventListener('click', () => toggleReaction(btn.dataset.post, btn.dataset.emoji, channel));
  });
  feedEl.querySelectorAll('[data-comment-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.commentToggle);
      if (expandedComments.has(id)) expandedComments.delete(id); else expandedComments.add(id);
      loadChannel(channel);
    });
  });
  feedEl.querySelectorAll('[data-comment-send]').forEach(btn => {
    btn.addEventListener('click', () => submitComment(Number(btn.dataset.commentSend), channel));
  });
  feedEl.querySelectorAll('[data-comment-input]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitComment(Number(input.dataset.commentInput), channel);
    });
  });
}

async function toggleReaction(postId, emoji, channel) {
  const { data: existing } = await supabaseClient.from('reactions').select('id')
    .eq('post_id', postId).eq('user_id', currentUser.id).eq('emoji', emoji).maybeSingle();
  if (existing) {
    await supabaseClient.from('reactions').delete().eq('id', existing.id);
  } else {
    await supabaseClient.from('reactions').insert({ post_id: postId, user_id: currentUser.id, emoji });
  }
  loadChannel(channel);
}

async function submitComment(postId, channel) {
  const input = document.querySelector(`[data-comment-input="${postId}"]`);
  const content = input.value.trim();
  if (!content) return;
  expandedComments.add(postId);
  const { error } = await supabaseClient.from('comments').insert({ post_id: postId, user_id: currentUser.id, content });
  if (error) { alert('Could not comment: ' + error.message); return; }
  loadChannel(channel);
}

// ================= CHAT =================
let chatMessagesCache = [];

function initChat() {
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  const replyCancel = document.getElementById('reply-cancel');

  sendBtn.addEventListener('click', sendChatMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
  replyCancel.addEventListener('click', () => { replyingTo = null; updateReplyBanner(); });
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content) return;
  const { error } = await supabaseClient.from('messages').insert({
    user_id: currentUser.id,
    content,
    reply_to_id: replyingTo ? replyingTo.id : null,
  });
  if (error) { alert('Could not send: ' + error.message); return; }
  input.value = '';
  replyingTo = null;
  updateReplyBanner();
  loadChat();
}

function updateReplyBanner() {
  const banner = document.getElementById('reply-banner');
  const text = document.getElementById('reply-banner-text');
  if (replyingTo) {
    banner.classList.remove('hidden');
    text.textContent = `Replying to ${replyingTo.authorName}: "${replyingTo.snippet}"`;
  } else {
    banner.classList.add('hidden');
  }
}

async function loadChat() {
  const { data: messages, error } = await supabaseClient
    .from('messages')
    .select('id, content, created_at, user_id, reply_to_id, profiles(name)')
    .order('created_at', { ascending: true })
    .limit(300);

  if (error) return;
  chatMessagesCache = messages || [];
  renderChat();
}

function renderChat() {
  const box = document.getElementById('chat-messages');
  if (!chatMessagesCache.length) {
    box.innerHTML = `<div class="empty-state">No messages yet. Say something.</div>`;
    return;
  }
  const byId = Object.fromEntries(chatMessagesCache.map(m => [m.id, m]));

  box.innerHTML = chatMessagesCache.map(msg => {
    const authorName = msg.profiles ? msg.profiles.name : 'Member';
    const time = formatTime(msg.created_at);
    const quoted = msg.reply_to_id ? byId[msg.reply_to_id] : null;
    const quoteHtml = quoted
      ? `<div class="chat-msg-quote">↳ ${escapeHtml(quoted.profiles ? quoted.profiles.name : 'Member')}: ${escapeHtml(truncate(quoted.content, 60))}</div>`
      : '';
    return `
      <div class="chat-msg">
        ${quoteHtml}
        <div class="chat-msg-meta">
          <span class="chat-msg-author">${escapeHtml(authorName)}</span>
          <span class="chat-msg-time">${time}</span>
        </div>
        <div class="chat-msg-bubble">${escapeHtml(msg.content)}</div>
        <button class="chat-msg-reply" data-reply="${msg.id}">Reply</button>
      </div>
    `;
  }).join('');

  box.querySelectorAll('[data-reply]').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = byId[Number(btn.dataset.reply)];
      replyingTo = { id: msg.id, authorName: msg.profiles ? msg.profiles.name : 'Member', snippet: truncate(msg.content, 40) };
      updateReplyBanner();
      document.getElementById('chat-input').focus();
    });
  });

  box.scrollTop = box.scrollHeight;
}

// ================= CHECK-IN =================
let currentCheckinItems = {}; // in-memory values for today, keyed by item id

function visibleChecklistItems() {
  const hasClients = !!(currentProfile && currentProfile.has_clients);
  return CHECKLIST_ITEMS.filter(item => !item.clientsOnly || hasClients);
}

function initCheckin() {
  const clientsToggle = document.getElementById('clients-toggle');
  clientsToggle.checked = !!(currentProfile && currentProfile.has_clients);
  clientsToggle.addEventListener('change', async () => {
    currentProfile.has_clients = clientsToggle.checked;
    await supabaseClient.from('profiles').update({ has_clients: clientsToggle.checked }).eq('id', currentUser.id);
    renderChecklistShell();
    loadCheckin();
  });

  renderChecklistShell();
  loadCheckin();
}

function renderChecklistShell() {
  const card = document.getElementById('checklist-card');
  card.innerHTML = visibleChecklistItems().map(item => {
    if (item.type === 'counter') {
      return `
        <div class="checklist-item counter-item" data-item-row="${item.id}">
          <div class="counter-label-wrap">
            <label>${escapeHtml(item.label)}</label>
            <span class="counter-target" id="target-${item.id}">0 / ${item.target}</span>
          </div>
          <div class="counter-controls">
            <button class="counter-btn" data-counter-dec="${item.id}" type="button">−</button>
            <span class="counter-value" id="count-${item.id}">0</span>
            <button class="counter-btn" data-counter-inc="${item.id}" type="button">+</button>
          </div>
        </div>
      `;
    }
    return `
      <div class="checklist-item" data-item-row="${item.id}">
        <input type="checkbox" id="chk-${item.id}" data-item="${item.id}" />
        <label for="chk-${item.id}">${escapeHtml(item.label)}</label>
      </div>
    `;
  }).join('') + `<div class="checkin-status" id="checkin-status"></div>`;

  card.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      currentCheckinItems[cb.dataset.item] = cb.checked;
      document.querySelector(`[data-item-row="${cb.dataset.item}"]`).classList.toggle('checked', cb.checked);
      saveCheckin();
    });
  });
  card.querySelectorAll('[data-counter-inc]').forEach(btn => {
    btn.addEventListener('click', () => adjustCounter(btn.dataset.counterInc, 1));
  });
  card.querySelectorAll('[data-counter-dec]').forEach(btn => {
    btn.addEventListener('click', () => adjustCounter(btn.dataset.counterDec, -1));
  });
}

function adjustCounter(itemId, delta) {
  const item = CHECKLIST_ITEMS.find(i => i.id === itemId);
  const current = Number(currentCheckinItems[itemId]) || 0;
  const next = Math.max(0, current + delta);
  currentCheckinItems[itemId] = next;
  document.getElementById(`count-${itemId}`).textContent = next;
  document.getElementById(`target-${itemId}`).textContent = `${next} / ${item.target}`;
  document.querySelector(`[data-item-row="${itemId}"]`).classList.toggle('checked', next >= item.target);
  saveCheckin();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadCheckin() {
  const { data: rows } = await supabaseClient
    .from('checkins')
    .select('checkin_date, items, completed')
    .eq('user_id', currentUser.id)
    .order('checkin_date', { ascending: false })
    .limit(120);

  const today = todayStr();
  const todayRow = (rows || []).find(r => r.checkin_date === today);
  currentCheckinItems = todayRow ? { ...todayRow.items } : {};

  visibleChecklistItems().forEach(item => {
    if (item.type === 'counter') {
      const val = Number(currentCheckinItems[item.id]) || 0;
      document.getElementById(`count-${item.id}`).textContent = val;
      document.getElementById(`target-${item.id}`).textContent = `${val} / ${item.target}`;
      document.querySelector(`[data-item-row="${item.id}"]`).classList.toggle('checked', val >= item.target);
    } else {
      const checked = !!currentCheckinItems[item.id];
      const cb = document.getElementById(`chk-${item.id}`);
      cb.checked = checked;
      document.querySelector(`[data-item-row="${item.id}"]`).classList.toggle('checked', checked);
    }
  });

  updateCheckinStatus(todayRow);
  renderStreak(rows || []);
}

function isItemComplete(item) {
  const val = currentCheckinItems[item.id];
  return item.type === 'counter' ? (Number(val) || 0) >= item.target : !!val;
}

async function saveCheckin() {
  const items = { ...currentCheckinItems };
  const completed = visibleChecklistItems().every(isItemComplete);

  const { error } = await supabaseClient.from('checkins').upsert({
    user_id: currentUser.id,
    checkin_date: todayStr(),
    items,
    completed,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,checkin_date' });

  if (error) { alert('Could not save check-in: ' + error.message); return; }
  updateCheckinStatus({ completed });
  const { data: rows } = await supabaseClient
    .from('checkins')
    .select('checkin_date, items, completed')
    .eq('user_id', currentUser.id)
    .order('checkin_date', { ascending: false })
    .limit(120);
  renderStreak(rows || []);
}

function updateCheckinStatus(todayRow) {
  const el = document.getElementById('checkin-status');
  const done = todayRow && todayRow.completed;
  el.textContent = done ? "Today's check-in complete. Nice work." : 'Check off everything to complete today.';
  el.classList.toggle('complete', !!done);
}

function renderStreak(rows) {
  const completedDates = new Set(rows.filter(r => r.completed).map(r => r.checkin_date));

  let streak = 0;
  let cursor = new Date();
  const cursorStr = () => `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;

  if (!completedDates.has(cursorStr())) {
    cursor.setDate(cursor.getDate() - 1); // today not done yet — check from yesterday, don't break streak
  }
  while (completedDates.has(cursorStr())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  document.getElementById('streak-count').textContent = streak;

  let currentLevel = LEVELS[0];
  let nextLevel = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (streak >= LEVELS[i].min) currentLevel = LEVELS[i];
    else { nextLevel = LEVELS[i]; break; }
  }

  document.getElementById('level-name').textContent = currentLevel.name;
  const fill = document.getElementById('level-progress-fill');
  const nextEl = document.getElementById('level-next');

  if (nextLevel) {
    const span = nextLevel.min - currentLevel.min;
    const progressed = streak - currentLevel.min;
    fill.style.width = `${Math.min(100, Math.round((progressed / span) * 100))}%`;
    nextEl.textContent = `${nextLevel.min - streak} day${nextLevel.min - streak === 1 ? '' : 's'} to ${nextLevel.name}`;
  } else {
    fill.style.width = '100%';
    nextEl.textContent = 'Max level reached.';
  }
}

// ================= REALTIME =================
function subscribeRealtime() {
  supabaseClient.channel('p2p-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
      const channel = payload.new?.channel || payload.old?.channel;
      if (channel) loadChannel(channel);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
      ['wins', 'board', 'announcements'].forEach(loadChannel);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => {
      ['wins', 'board', 'announcements'].forEach(loadChannel);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadChat())
    .subscribe();
}

// ================= HELPERS =================
function formatTime(iso) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function linkify(escapedHtml) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  return escapedHtml.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}
