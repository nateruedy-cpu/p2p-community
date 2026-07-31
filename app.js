// ================= SITE GATE =================
// Soft deterrent only — visible in this source file to anyone who looks. Change it any time.
const SITE_PASSWORD = 'ScaleTo$30k';

(function initGate() {
  const gate = document.getElementById('site-gate');
  const form = document.getElementById('gate-form');
  const input = document.getElementById('gate-password');
  const errorEl = document.getElementById('gate-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value === SITE_PASSWORD) {
      localStorage.setItem('p2p_gate_passed', 'true');
      gate.style.display = 'none';
    } else {
      errorEl.textContent = 'Incorrect password.';
      errorEl.classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  });
})();

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================================
// EDIT THESE FREELY — nothing else in the file needs to change.
// =========================================================================

// Daily check-in items. Add/remove/rename items any time.
// type: 'boolean' = simple checkbox. 'counter' = tap +/- to hit a daily target (e.g. cold DMs sent).
// clientsOnly: true = item only shows for members who've marked "I coach clients" on.
// skipIfChecked: '<other item id>' = this item is skipped (not required) for the day if that other item is checked (e.g. "Got to the gym" skips if "Today is a rest day" is checked).
// category: groups items into their own command-center card. Add a new category name to create a new card — and a matching color in CATEGORY_COLORS below.
const CHECKLIST_ITEMS = [
  // Morning Physical
  { id: 'hydrate',          label: 'Hydrated first thing (16 oz water)',      type: 'boolean', category: 'Morning Physical' },
  { id: 'sunlight',         label: 'Got sunlight / outside time',             type: 'boolean', category: 'Morning Physical' },
  { id: 'rest_day',         label: 'Today is a rest day',                     type: 'boolean', category: 'Morning Physical' },
  { id: 'gym',              label: 'Got to the gym',                         type: 'boolean', category: 'Morning Physical', skipIfChecked: 'rest_day' },

  // Morning Business Review
  { id: 'reviewed_kpi',     label: "Reviewed yesterday's KPIs",              type: 'boolean', category: 'Morning Business Review' },
  { id: 'revenue_task',     label: 'Set #1 revenue task for today',          type: 'boolean', category: 'Morning Business Review' },
  { id: 'client_submissions', label: 'Checked client submissions (if any)',  type: 'boolean', category: 'Morning Business Review' },

  // Client Delivery
  { id: 'client_checkins',  label: 'Checked in with clients',                type: 'counter', target: 1, clientsOnly: true, category: 'Client Delivery' },
  { id: 'client_result',    label: 'Posted a client result/win',             type: 'boolean', category: 'Client Delivery' },
  { id: 'client_messages',  label: 'Responded to all client messages',       type: 'boolean', category: 'Client Delivery' },

  // Social Media
  { id: 'posted_ig',        label: 'Posted on Instagram',                    type: 'boolean', category: 'Social Media' },
  { id: 'posted_youtube',   label: 'Posted on YouTube',                      type: 'boolean', category: 'Social Media' },
  { id: 'posted_tiktok',    label: 'Posted on TikTok',                       type: 'boolean', category: 'Social Media' },
  { id: 'replied_comments', label: 'Replied to comments/DMs',                type: 'boolean', category: 'Social Media' },

  // Sales & Lead Generation
  { id: 'cold_dms',         label: 'Sent cold DMs',    type: 'counter', target: 10, category: 'Sales & Lead Generation' },
  { id: 'sales_calls',      label: 'Sales calls',      type: 'counter', target: 2,  category: 'Sales & Lead Generation' },
  { id: 'ads_checked',      label: 'Checked ad performance', type: 'boolean', category: 'Sales & Lead Generation' },

  // Training & Nutrition
  { id: 'hit_protein',      label: 'Hit protein target',    type: 'boolean', category: 'Training & Nutrition' },
  { id: 'hit_calories',     label: 'Hit calorie target',    type: 'boolean', category: 'Training & Nutrition' },
  { id: 'cardio_done',      label: 'Cardio session done',   type: 'boolean', category: 'Training & Nutrition' },
  { id: 'logged_weight',    label: 'Logged bodyweight',     type: 'boolean', category: 'Training & Nutrition' },
  { id: 'mindset',          label: 'Did something for my mindset (prayer, journaling, reading)', type: 'boolean', category: 'Training & Nutrition' },
];

// One accent color per category card. Add a matching entry here if you add a new category above.
const CATEGORY_COLORS = {
  'Morning Physical': '#e0a339',
  'Morning Business Review': '#7c8fe0',
  'Client Delivery': '#dd7fa0',
  'Social Media': '#4a9fd8',
  'Sales & Lead Generation': '#d97a3f',
  'Training & Nutrition': '#4caf7d',
};

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

// Full palette available in the reaction picker on every post.
const REACTION_EMOJIS = ['🔥', '💪', '🏆', '👍', '😂', '❤️', '🎉', '💯', '👏', '😮', '🙏', '😢'];

const CHANNEL_CONFIG = {
  wins:          { badge: 'WIN NO.' },
  board:         { badge: 'POST NO.' },
  announcements: { badge: 'ANNOUNCEMENT NO.' },
  introductions: { badge: 'MEMBER NO.' },
};

let isSignUp = false;
let currentUser = null;
let currentProfile = null;
let appInitialized = false;
let hasIntroduced = false;
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
  renderSidenavAvatar();

  document.getElementById('composer-announcements').classList.toggle(
    'hidden', !(currentProfile && (currentProfile.can_announce || currentProfile.is_admin))
  );
  document.getElementById('nav-admin').classList.toggle('hidden', !(currentProfile && currentProfile.is_admin));

  if (appInitialized) return; // onAuthStateChange can fire more than once per session — only wire up listeners once
  appInitialized = true;

  initNav();
  initComposers();
  initChat();
  initCheckin();
  initProfileModal();
  initMessages();
  initIntroGate();
  initProfileViewer();

  loadChannel('wins');
  loadChannel('board');
  loadChannel('announcements');
  loadChannel('introductions');
  loadChat();
  loadDmConversations();
  loadLeaderboard();
  if (currentProfile && currentProfile.is_admin) loadAdminPanel();
  subscribeRealtime();
  checkIntroStatus();
}

function renderSidenavAvatar() {
  document.getElementById('sidenav-avatar').innerHTML = avatarInnerHtml(currentProfile);
}

// Returns just the inner content (img or initial) for placing inside an existing .avatar-circle element
function avatarInnerHtml(profile) {
  const name = profile && profile.name ? profile.name : '?';
  const initial = escapeHtml(name.trim().charAt(0).toUpperCase() || '?');
  if (profile && profile.avatar_url) {
    return `<img src="${escapeHtml(profile.avatar_url)}" alt="${initial}" />`;
  }
  return initial;
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
  const target = document.getElementById(`view-${view}`);
  target.classList.remove('hidden');
  target.classList.remove('view-enter');
  void target.offsetWidth; // restart the entrance animation even if the same view is reselected
  target.classList.add('view-enter');

  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  sidenav.classList.remove('open');

  const accent = getComputedStyle(target).getPropertyValue('--accent').trim();
  if (accent) document.documentElement.style.setProperty('--live-accent', accent);

  if (view === 'chat') {
    const box = document.getElementById('chat-messages');
    box.scrollTop = box.scrollHeight;
  }
  if (view === 'leaderboard') loadLeaderboard();
  if (view === 'admin') loadAdminPanel();
}

// ================= IMAGE ATTACHMENTS (shared by posts, chat, DMs) =================
const pendingImages = {};
const attachRegistry = {};

function setupImageAttach(key, footerEl, insertBeforeEl, previewParent, previewInsertBeforeEl) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.className = 'hidden';
  footerEl.appendChild(fileInput);

  const attachBtn = document.createElement('button');
  attachBtn.type = 'button';
  attachBtn.className = 'attach-btn';
  attachBtn.textContent = '📎';
  attachBtn.title = 'Attach image';
  footerEl.insertBefore(attachBtn, insertBeforeEl);

  const preview = document.createElement('div');
  preview.className = 'attach-preview hidden';
  previewParent.insertBefore(preview, previewInsertBeforeEl);

  attachRegistry[key] = { fileInput, preview };

  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); fileInput.value = ''; return; }
    if (file.size > 8 * 1024 * 1024) { alert('Image must be under 8MB.'); fileInput.value = ''; return; }
    pendingImages[key] = file;
    const reader = new FileReader();
    reader.onload = () => {
      preview.innerHTML = `<img src="${reader.result}" alt="attachment preview" /><button type="button" class="attach-remove">✕ Remove</button>`;
      preview.classList.remove('hidden');
      preview.querySelector('.attach-remove').addEventListener('click', () => clearPendingImage(key));
    };
    reader.readAsDataURL(file);
  });
}

function clearPendingImage(key) {
  pendingImages[key] = null;
  const reg = attachRegistry[key];
  if (reg) {
    reg.preview.classList.add('hidden');
    reg.preview.innerHTML = '';
    reg.fileInput.value = '';
  }
}

async function uploadAttachment(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseClient.storage.from('attachments').upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabaseClient.storage.from('attachments').getPublicUrl(path);
  return data.publicUrl;
}

function attachmentImgHtml(url) {
  return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><img class="attached-image" src="${escapeHtml(url)}" alt="attachment" /></a>` : '';
}

// ================= POSTS (wins / board / announcements) =================
function initComposers() {
  ['wins', 'board', 'announcements', 'introductions'].forEach(channel => {
    const composer = document.getElementById(`composer-${channel}`);
    if (!composer) return;
    const titleInput = composer.querySelector('.title-input');
    const textarea = composer.querySelector('textarea');
    const countEl = composer.querySelector('.char-count');
    const postBtn = composer.querySelector('.btn-post');
    const footer = composer.querySelector('.composer-footer');

    textarea.addEventListener('input', () => {
      countEl.textContent = `${textarea.value.length} / 2000`;
    });
    attachMentionAutocomplete(textarea);
    setupImageAttach(channel, footer, postBtn, composer, footer);

    postBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      const title = titleInput ? titleInput.value.trim() : '';
      if (!content) return;
      postBtn.disabled = true;

      let image_url = null;
      try {
        if (pendingImages[channel]) image_url = await uploadAttachment(pendingImages[channel]);
      } catch (err) {
        postBtn.disabled = false;
        alert('Could not upload image: ' + err.message);
        return;
      }

      const { error } = await supabaseClient.from('posts').insert({
        user_id: currentUser.id, channel, content, title: title || null, image_url,
      });
      postBtn.disabled = false;
      if (error) { alert('Could not post: ' + error.message); return; }
      textarea.value = '';
      if (titleInput) titleInput.value = '';
      countEl.textContent = '0 / 2000';
      clearPendingImage(channel);
      loadChannel(channel);
      if (channel === 'introductions') checkIntroStatus();
    });
  });
}

async function loadChannel(channel) {
  const feedElPre = document.getElementById(`feed-${channel}`);
  if (feedElPre && feedElPre.dataset.loaded !== 'true') {
    feedElPre.innerHTML = skeletonHtml();
  }

  const { data: posts, error } = await supabaseClient
    .from('posts')
    .select('id, title, content, image_url, created_at, user_id, profiles(name, avatar_url)')
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(150);

  const feedEl = document.getElementById(`feed-${channel}`);
  if (!feedEl) return;
  feedEl.dataset.loaded = 'true';
  if (error) { feedEl.innerHTML = `<div class="empty-state">Couldn't load. ${error.message}</div>`; return; }
  if (!posts.length) {
    feedEl.innerHTML = `<div class="empty-state">Nothing here yet.<br>Be the first to post.</div>`;
    return;
  }

  const postIds = posts.map(p => p.id);
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabaseClient.from('reactions').select('post_id, user_id, emoji').in('post_id', postIds),
    supabaseClient.from('comments').select('id, post_id, user_id, content, created_at, profiles(name, avatar_url)').in('post_id', postIds).order('created_at', { ascending: true }),
  ]);

  renderChannel(channel, posts, reactions || [], comments || []);
}

let openPickerPostId = null;

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
    const isMine = post.user_id === currentUser.id;

    // Aggregate reactions into emoji -> count/active chips
    const emojiGroups = {};
    postReactions.forEach(r => {
      if (!emojiGroups[r.emoji]) emojiGroups[r.emoji] = [];
      emojiGroups[r.emoji].push(r.user_id);
    });
    const usedEmojis = Object.keys(emojiGroups);

    const chipButtons = usedEmojis.map(emoji => {
      const users = emojiGroups[emoji];
      const active = users.includes(currentUser.id);
      return `<button class="reaction-btn ${active ? 'active' : ''}" data-post="${post.id}" data-emoji="${emoji}">
        <span>${emoji}</span><span>${users.length}</span>
      </button>`;
    }).join('');

    const pickerOpen = openPickerPostId === post.id;
    const pickerHtml = `
      <div class="emoji-picker ${pickerOpen ? '' : 'hidden'}" data-picker="${post.id}">
        ${REACTION_EMOJIS.map(emoji => `<button class="emoji-picker-btn" data-post="${post.id}" data-emoji="${emoji}">${emoji}</button>`).join('')}
      </div>
    `;

    const commentsHtml = expanded ? `
      <div class="comments-block">
        ${postComments.map(c => `
          <div class="comment-row">
            <button class="comment-author-btn" data-view-profile="${c.user_id}">
              ${avatarHtml(c.profiles, 'small')}
              <span class="comment-author">${escapeHtml(c.profiles ? c.profiles.name : 'Member')}</span>
            </button>
            <span class="comment-text">${mentionify(escapeHtml(c.content))}</span>
            ${c.user_id === currentUser.id ? `<button class="comment-delete" data-comment-delete="${c.id}" title="Delete comment">✕</button>` : ''}
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
          <button class="post-author-row" data-view-profile="${post.user_id}">
            ${avatarHtml(post.profiles, 'small')}
            <div>
              <span class="post-author">${escapeHtml(authorName)}</span>
              <div class="post-badge">${cfg.badge} ${num}</div>
            </div>
          </button>
          <div class="post-meta-right">
            <span class="post-time">${time}</span>
            ${isMine ? `<button class="post-delete" data-post-delete="${post.id}" title="Delete post">✕</button>` : ''}
          </div>
        </div>
        ${post.title ? `<div class="post-title">${escapeHtml(post.title)}</div>` : ''}
        <div class="post-content">${mentionify(linkify(escapeHtml(post.content)))}</div>${attachmentImgHtml(post.image_url)}
        <div class="post-actions">
          ${chipButtons}
          <button class="reaction-add-btn" data-picker-toggle="${post.id}">+ React</button>
          <button class="comment-toggle" data-comment-toggle="${post.id}">Comments (${postComments.length})</button>
        </div>
        ${pickerHtml}
        ${commentsHtml}
      </div>
    `;
  }).join('');

  feedEl.querySelectorAll('[data-post]').forEach(btn => {
    btn.addEventListener('click', () => toggleReaction(btn.dataset.post, btn.dataset.emoji, channel));
  });
  feedEl.querySelectorAll('[data-picker-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.pickerToggle);
      openPickerPostId = openPickerPostId === id ? null : id;
      renderChannel(channel, posts, reactions, comments);
    });
  });
  feedEl.querySelectorAll('[data-post-delete]').forEach(btn => {
    btn.addEventListener('click', () => deletePost(Number(btn.dataset.postDelete), channel));
  });
  feedEl.querySelectorAll('[data-comment-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteComment(Number(btn.dataset.commentDelete), channel));
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
    attachMentionAutocomplete(input);
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
  openPickerPostId = null;
  loadChannel(channel);
}

async function deletePost(postId, channel) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  const { error } = await supabaseClient.from('posts').delete().eq('id', postId);
  if (error) { alert('Could not delete: ' + error.message); return; }
  loadChannel(channel);
  if (channel === 'introductions') checkIntroStatus();
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

async function deleteComment(commentId, channel) {
  const { error } = await supabaseClient.from('comments').delete().eq('id', commentId);
  if (error) { alert('Could not delete comment: ' + error.message); return; }
  loadChannel(channel);
}

// ================= CHAT =================
let chatMessagesCache = [];

function initChat() {
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  const replyCancel = document.getElementById('reply-cancel');
  const row = input.closest('.chat-input-row');

  sendBtn.addEventListener('click', sendChatMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
  replyCancel.addEventListener('click', () => { replyingTo = null; updateReplyBanner(); });
  attachMentionAutocomplete(input);
  setupImageAttach('chat', row, sendBtn, row.parentElement, row);
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content && !pendingImages['chat']) return;

  let image_url = null;
  try {
    if (pendingImages['chat']) image_url = await uploadAttachment(pendingImages['chat']);
  } catch (err) {
    alert('Could not upload image: ' + err.message);
    return;
  }

  const { error } = await supabaseClient.from('messages').insert({
    user_id: currentUser.id,
    content: content || '📎 Image',
    reply_to_id: replyingTo ? replyingTo.id : null,
    image_url,
  });
  if (error) { alert('Could not send: ' + error.message); return; }
  input.value = '';
  clearPendingImage('chat');
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
    .select('id, content, image_url, created_at, user_id, reply_to_id, profiles(name, avatar_url)')
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
        <button class="chat-msg-meta" data-view-profile="${msg.user_id}">
          ${avatarHtml(msg.profiles, 'small')}
          <span class="chat-msg-author">${escapeHtml(authorName)}</span>
          <span class="chat-msg-time">${time}</span>
        </button>
        ${msg.content === '📎 Image' && msg.image_url ? '' : `<div class="chat-msg-bubble">${mentionify(escapeHtml(msg.content))}</div>`}
        ${attachmentImgHtml(msg.image_url)}
        <div class="chat-msg-footer">
          <button class="chat-msg-reply" data-reply="${msg.id}">Reply</button>
          ${msg.user_id === currentUser.id ? `<button class="chat-msg-reply" data-delete-msg="${msg.id}">Delete</button>` : ''}
        </div>
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
  box.querySelectorAll('[data-delete-msg]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await supabaseClient.from('messages').delete().eq('id', Number(btn.dataset.deleteMsg));
      if (error) { alert('Could not delete: ' + error.message); return; }
      loadChat();
    });
  });

  box.scrollTop = box.scrollHeight;
}

// ================= CHECK-IN =================
let currentCheckinItems = {}; // in-memory values for today, keyed by item id

function visibleChecklistItems() {
  const hasClients = !!(currentProfile && currentProfile.has_clients);
  return CHECKLIST_ITEMS.filter(item => {
    if (item.clientsOnly && !hasClients) return false;
    if (item.skipIfChecked && currentCheckinItems[item.skipIfChecked]) return false;
    return true;
  });
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
  initJournal();
}

function initJournal() {
  ['journal-win', 'journal-improve', 'journal-free'].forEach(id => {
    document.getElementById(id).addEventListener('blur', saveJournal);
  });
}

function loadJournalFields(todayRow) {
  const items = todayRow ? todayRow.items : {};
  document.getElementById('journal-win').value = items.journal_win || '';
  document.getElementById('journal-improve').value = items.journal_improve || '';
  document.getElementById('journal-free').value = items.journal_free || '';
}

async function saveJournal() {
  currentCheckinItems.journal_win = document.getElementById('journal-win').value.trim();
  currentCheckinItems.journal_improve = document.getElementById('journal-improve').value.trim();
  currentCheckinItems.journal_free = document.getElementById('journal-free').value.trim();
  await saveCheckin();
  const note = document.getElementById('journal-saved-note');
  note.classList.remove('hidden');
  setTimeout(() => note.classList.add('hidden'), 1500);
}

function renderChecklistShell() {
  const container = document.getElementById('command-center');
  const items = visibleChecklistItems();

  const categories = [];
  items.forEach(item => {
    const cat = item.category || 'Daily';
    let group = categories.find(c => c.name === cat);
    if (!group) { group = { name: cat, items: [] }; categories.push(group); }
    group.items.push(item);
  });

  container.innerHTML = categories.map(group => `
    <div class="category-card" data-category="${escapeHtml(group.name)}" style="--cat-accent:${CATEGORY_COLORS[group.name] || 'var(--green)'}">
      <div class="category-header">
        <span class="category-title">${escapeHtml(group.name)}</span>
        <span class="category-fraction" id="cat-fraction-${slugify(group.name)}">0 / ${group.items.length}</span>
      </div>
      <div class="category-progress-track">
        <div class="category-progress-fill" id="cat-fill-${slugify(group.name)}" style="width:0%"></div>
      </div>
      <div class="category-body">
        ${group.items.map(item => {
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
        }).join('')}
      </div>
    </div>
  `).join('') + `<div class="checkin-status" id="checkin-status"></div>`;

  container.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      currentCheckinItems[cb.dataset.item] = cb.checked;
      const affectsVisibility = CHECKLIST_ITEMS.some(i => i.skipIfChecked === cb.dataset.item);
      if (affectsVisibility) {
        renderChecklistShell();
        applyCheckinStateToDom();
      } else {
        document.querySelector(`[data-item-row="${cb.dataset.item}"]`).classList.toggle('checked', cb.checked);
      }
      updateCategoryProgress();
      saveCheckin();
    });
  });
  container.querySelectorAll('[data-counter-inc]').forEach(btn => {
    btn.addEventListener('click', () => adjustCounter(btn.dataset.counterInc, 1));
  });
  container.querySelectorAll('[data-counter-dec]').forEach(btn => {
    btn.addEventListener('click', () => adjustCounter(btn.dataset.counterDec, -1));
  });
}

// Applies the in-memory currentCheckinItems values to whatever checklist DOM is currently rendered.
// Called after loading today's data, and after any re-render triggered by a skip-toggle like "rest day".
function applyCheckinStateToDom() {
  visibleChecklistItems().forEach(item => {
    if (item.type === 'counter') {
      const val = Number(currentCheckinItems[item.id]) || 0;
      const countEl = document.getElementById(`count-${item.id}`);
      const targetEl = document.getElementById(`target-${item.id}`);
      if (countEl) countEl.textContent = val;
      if (targetEl) targetEl.textContent = `${val} / ${item.target}`;
      const row = document.querySelector(`[data-item-row="${item.id}"]`);
      if (row) row.classList.toggle('checked', val >= item.target);
    } else {
      const checked = !!currentCheckinItems[item.id];
      const cb = document.getElementById(`chk-${item.id}`);
      if (cb) cb.checked = checked;
      const row = document.querySelector(`[data-item-row="${item.id}"]`);
      if (row) row.classList.toggle('checked', checked);
    }
  });
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function updateCategoryProgress() {
  const items = visibleChecklistItems();
  const categories = [];
  items.forEach(item => {
    const cat = item.category || 'Daily';
    let group = categories.find(c => c.name === cat);
    if (!group) { group = { name: cat, items: [] }; categories.push(group); }
    group.items.push(item);
  });

  categories.forEach(group => {
    const done = group.items.filter(isItemComplete).length;
    const total = group.items.length;
    const slug = slugify(group.name);
    const fractionEl = document.getElementById(`cat-fraction-${slug}`);
    const fillEl = document.getElementById(`cat-fill-${slug}`);
    if (fractionEl) fractionEl.textContent = `${done} / ${total}`;
    if (fillEl) fillEl.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
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
  updateCategoryProgress();
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

  renderChecklistShell(); // re-render now that currentCheckinItems reflects today's saved state (e.g. rest day)
  applyCheckinStateToDom();
  loadJournalFields(todayRow);

  updateCategoryProgress();
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

function computeStreakAndLevel(rows) {
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

  let currentLevel = LEVELS[0];
  let nextLevel = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (streak >= LEVELS[i].min) currentLevel = LEVELS[i];
    else { nextLevel = LEVELS[i]; break; }
  }

  return { streak, currentLevel, nextLevel };
}

function renderStreak(rows) {
  const { streak, currentLevel, nextLevel } = computeStreakAndLevel(rows);

  animateNumber(document.getElementById('streak-count'), streak);

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

  renderWeekSummary(rows);
  maybeCelebrateMilestone(currentLevel);
}

function renderWeekSummary(rows) {
  const byDate = Object.fromEntries(rows.map(r => [r.checkin_date, r]));
  const days = [];
  const cursor = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ key, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), row: byDate[key] });
  }

  const stripHtml = days.map(d => {
    const completed = d.row && d.row.completed;
    const isToday = d.key === days[days.length - 1].key;
    return `<div class="week-day ${completed ? 'complete' : ''} ${isToday ? 'today' : ''}" title="${d.key}">
      <span class="week-day-dot"></span>
      <span class="week-day-label">${d.label}</span>
    </div>`;
  }).join('');

  const counterItems = visibleChecklistItems().filter(i => i.type === 'counter');
  const totalsHtml = counterItems.map(item => {
    const sum = days.reduce((acc, d) => acc + (d.row ? Number(d.row.items[item.id]) || 0 : 0), 0);
    const target = item.target * 7;
    return `<div class="week-total"><span class="week-total-label">${escapeHtml(item.label)}</span><span class="week-total-value">${sum} / ${target}</span></div>`;
  }).join('');

  const card = document.getElementById('week-summary-card');
  card.innerHTML = `
    <div class="week-summary-header">This Week</div>
    <div class="week-strip">${stripHtml}</div>
    ${totalsHtml ? `<div class="week-totals">${totalsHtml}</div>` : ''}
  `;
}

// ================= PROFILE EDIT =================
let pendingAvatarFile = null;
let croppedAvatarBlob = null;
let cropImage = null;
let cropBaseScale = 1;
let cropScale = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let cropDragging = false;
let cropDragStartX = 0;
let cropDragStartY = 0;
let cropOffsetStartX = 0;
let cropOffsetStartY = 0;

function initProfileModal() {
  const overlay = document.getElementById('profile-modal-overlay');
  const openBtn = document.getElementById('edit-profile-btn');
  const closeBtn = document.getElementById('profile-modal-close');
  const saveBtn = document.getElementById('profile-save-btn');
  const fileInput = document.getElementById('avatar-file-input');
  const uploadBtn = document.getElementById('avatar-upload-btn');
  const cropCanvas = document.getElementById('crop-canvas');
  const cropZoom = document.getElementById('crop-zoom');

  openBtn.addEventListener('click', () => {
    document.getElementById('profile-name-input').value = currentProfile.name || '';
    document.getElementById('profile-bio-input').value = currentProfile.bio || '';
    document.getElementById('profile-ig-input').value = currentProfile.instagram_url || '';
    document.getElementById('modal-avatar-preview').innerHTML = avatarInnerHtml(currentProfile);
    document.getElementById('profile-modal-error').classList.add('hidden');
    document.getElementById('profile-modal-fields').classList.remove('hidden');
    document.getElementById('crop-stage').classList.add('hidden');
    pendingAvatarFile = null;
    croppedAvatarBlob = null;

    document.getElementById('notif-announcements').checked = currentProfile.notify_announcements !== false;
    document.getElementById('notif-mentions').checked = currentProfile.notify_mentions !== false;
    document.getElementById('notif-dms').checked = currentProfile.notify_dms !== false;
    document.getElementById('notif-daily').checked = currentProfile.notify_daily_reminder !== false;

    overlay.classList.remove('hidden');
  });

  const notifToggles = [
    ['notif-announcements', 'notify_announcements'],
    ['notif-mentions', 'notify_mentions'],
    ['notif-dms', 'notify_dms'],
    ['notif-daily', 'notify_daily_reminder'],
  ];
  notifToggles.forEach(([elId, field]) => {
    document.getElementById(elId).addEventListener('change', async (e) => {
      currentProfile[field] = e.target.checked;
      const { error } = await supabaseClient.from('profiles').update({ [field]: e.target.checked }).eq('id', currentUser.id);
      if (error) { alert('Could not save preference: ' + error.message); e.target.checked = !e.target.checked; }
    });
  });

  closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });

  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) openCropStage(file);
    fileInput.value = '';
  });

  // ---- Crop stage: drag to pan, slider to zoom ----
  cropCanvas.addEventListener('pointerdown', (e) => {
    cropDragging = true;
    cropDragStartX = e.clientX;
    cropDragStartY = e.clientY;
    cropOffsetStartX = cropOffsetX;
    cropOffsetStartY = cropOffsetY;
  });
  window.addEventListener('pointermove', (e) => {
    if (!cropDragging) return;
    cropOffsetX = cropOffsetStartX + (e.clientX - cropDragStartX);
    cropOffsetY = cropOffsetStartY + (e.clientY - cropDragStartY);
    clampCropOffsets();
    drawCropCanvas();
  });
  window.addEventListener('pointerup', () => { cropDragging = false; });

  cropZoom.addEventListener('input', (e) => {
    cropScale = Number(e.target.value);
    clampCropOffsets();
    drawCropCanvas();
  });

  document.getElementById('crop-cancel').addEventListener('click', () => {
    document.getElementById('crop-stage').classList.add('hidden');
    document.getElementById('profile-modal-fields').classList.remove('hidden');
  });

  document.getElementById('crop-confirm').addEventListener('click', () => {
    cropCanvas.toBlob((blob) => {
      croppedAvatarBlob = blob;
      pendingAvatarFile = null;
      const reader = new FileReader();
      reader.onload = () => {
        document.getElementById('modal-avatar-preview').innerHTML = `<img src="${reader.result}" alt="preview" />`;
      };
      reader.readAsDataURL(blob);
      document.getElementById('crop-stage').classList.add('hidden');
      document.getElementById('profile-modal-fields').classList.remove('hidden');
    }, 'image/jpeg', 0.92);
  });

  saveBtn.addEventListener('click', saveProfile);
}

function openCropStage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      cropImage = img;
      cropBaseScale = Math.max(280 / img.width, 280 / img.height);
      cropScale = 1;
      cropOffsetX = 0;
      cropOffsetY = 0;
      document.getElementById('crop-zoom').value = 1;
      document.getElementById('profile-modal-fields').classList.add('hidden');
      document.getElementById('crop-stage').classList.remove('hidden');
      drawCropCanvas();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clampCropOffsets() {
  const scale = cropBaseScale * cropScale;
  const w = cropImage.width * scale;
  const h = cropImage.height * scale;
  const maxOffsetX = Math.max(0, (w - 280) / 2);
  const maxOffsetY = Math.max(0, (h - 280) / 2);
  cropOffsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, cropOffsetX));
  cropOffsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, cropOffsetY));
}

function drawCropCanvas() {
  const canvas = document.getElementById('crop-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 280, 280);
  const scale = cropBaseScale * cropScale;
  const w = cropImage.width * scale;
  const h = cropImage.height * scale;
  const x = (280 - w) / 2 + cropOffsetX;
  const y = (280 - h) / 2 + cropOffsetY;
  ctx.save();
  ctx.beginPath();
  ctx.arc(140, 140, 140, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(cropImage, x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(140, 140, 140, 0, Math.PI * 2);
  ctx.stroke();
}

async function saveProfile() {
  const errorEl = document.getElementById('profile-modal-error');
  errorEl.classList.add('hidden');
  const saveBtn = document.getElementById('profile-save-btn');
  saveBtn.disabled = true;

  try {
    let avatarUrl = currentProfile.avatar_url || null;

    if (croppedAvatarBlob) {
      const path = `${currentUser.id}/avatar.jpg`;
      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(path, croppedAvatarBlob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
      avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`; // cache-bust so the new photo shows immediately
    }

    const name = document.getElementById('profile-name-input').value.trim();
    const bio = document.getElementById('profile-bio-input').value.trim();
    const instagram_url = document.getElementById('profile-ig-input').value.trim();

    if (!name) throw new Error('Name cannot be empty.');

    const { error } = await supabaseClient.from('profiles').update({
      name, bio, instagram_url, avatar_url: avatarUrl,
    }).eq('id', currentUser.id);
    if (error) throw error;

    currentProfile = { ...currentProfile, name, bio, instagram_url, avatar_url: avatarUrl };
    currentMemberEl.textContent = name;
    renderSidenavAvatar();
    document.getElementById('profile-modal-overlay').classList.add('hidden');
    pendingAvatarFile = null;
    croppedAvatarBlob = null;
  } catch (err) {
    errorEl.textContent = err.message || 'Could not save profile.';
    errorEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
  }
}

// ================= DIRECT MESSAGES =================
let allMembers = [];
let activeDmPartnerId = null;
let dmThreadCache = [];

function initMessages() {
  document.getElementById('dm-send').addEventListener('click', sendDm);
  document.getElementById('dm-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendDm(); });
  attachMentionAutocomplete(document.getElementById('dm-input'));
  document.getElementById('member-search').addEventListener('input', (e) => renderMemberList(e.target.value));

  const dmSendBtn = document.getElementById('dm-send');
  const dmRow = document.getElementById('dm-input').closest('.chat-input-row');
  setupImageAttach('dm', dmRow, dmSendBtn, dmRow.parentElement, dmRow);
}

let unreadFromCache = new Set();

async function loadDmConversations() {
  const { data: members } = await supabaseClient
    .from('profiles')
    .select('id, name, avatar_url')
    .neq('id', currentUser.id)
    .order('name', { ascending: true });

  allMembers = members || [];

  const { data: myMessages } = await supabaseClient
    .from('direct_messages')
    .select('id, sender_id, recipient_id, read')
    .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`);

  unreadFromCache = new Set(
    (myMessages || []).filter(m => m.recipient_id === currentUser.id && !m.read).map(m => m.sender_id)
  );

  const totalUnread = unreadFromCache.size;
  const badge = document.getElementById('dm-unread-badge');
  if (totalUnread > 0) { badge.textContent = totalUnread; badge.classList.remove('hidden'); }
  else { badge.classList.add('hidden'); }

  renderMemberList(document.getElementById('member-search').value);
}

function renderMemberList(filterText) {
  const listEl = document.getElementById('dm-conversation-list');
  if (!allMembers.length) {
    listEl.innerHTML = `<div class="empty-state">No other members yet.</div>`;
    return;
  }

  const query = (filterText || '').trim().toLowerCase();
  const filtered = query ? allMembers.filter(m => m.name.toLowerCase().includes(query)) : allMembers;

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state">No members match "${escapeHtml(filterText)}".</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(m => `
    <div class="dm-convo-item ${activeDmPartnerId === m.id ? 'active' : ''}" data-partner="${m.id}">
      ${avatarHtml(m, 'small')}
      <span class="dm-convo-name">${escapeHtml(m.name)}</span>
      ${unreadFromCache.has(m.id) ? '<span class="dm-convo-dot"></span>' : ''}
    </div>
  `).join('');

  listEl.querySelectorAll('[data-partner]').forEach(el => {
    el.addEventListener('click', () => openDmThread(el.dataset.partner));
  });
}

async function openDmThread(partnerId) {
  activeDmPartnerId = partnerId;
  document.getElementById('dm-thread-empty').classList.add('hidden');
  document.getElementById('dm-thread-active').classList.remove('hidden');

  const partner = allMembers.find(m => m.id === partnerId);
  document.getElementById('dm-thread-header').innerHTML = `${avatarHtml(partner, 'small')} <span>${escapeHtml(partner ? partner.name : 'Member')}</span>`;

  await loadDmThread();

  // mark their messages to me as read
  await supabaseClient.from('direct_messages')
    .update({ read: true })
    .eq('sender_id', partnerId)
    .eq('recipient_id', currentUser.id)
    .eq('read', false);

  loadDmConversations();

  document.querySelectorAll('.dm-convo-item').forEach(el => {
    el.classList.toggle('active', el.dataset.partner === partnerId);
  });
}

async function loadDmThread() {
  if (!activeDmPartnerId) return;
  const { data: messages } = await supabaseClient
    .from('direct_messages')
    .select('id, sender_id, recipient_id, content, image_url, created_at')
    .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeDmPartnerId}),and(sender_id.eq.${activeDmPartnerId},recipient_id.eq.${currentUser.id})`)
    .order('created_at', { ascending: true })
    .limit(300);

  dmThreadCache = messages || [];
  renderDmThread();
}

function renderDmThread() {
  const box = document.getElementById('dm-thread-messages');
  if (!dmThreadCache.length) {
    box.innerHTML = `<div class="empty-state">No messages yet. Say hey.</div>`;
    return;
  }
  box.innerHTML = dmThreadCache.map(msg => {
    const mine = msg.sender_id === currentUser.id;
    return `
      <div class="dm-bubble-row ${mine ? 'mine' : ''}">
        <div>
          ${msg.content === '📎 Image' && msg.image_url ? '' : `<div class="dm-bubble">${mentionify(escapeHtml(msg.content))}</div>`}
          ${attachmentImgHtml(msg.image_url)}
          <div class="dm-bubble-time">${formatTime(msg.created_at)}</div>
        </div>
      </div>
    `;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

async function sendDm() {
  if (!activeDmPartnerId) return;
  const input = document.getElementById('dm-input');
  const content = input.value.trim();
  if (!content && !pendingImages['dm']) return;

  let image_url = null;
  try {
    if (pendingImages['dm']) image_url = await uploadAttachment(pendingImages['dm']);
  } catch (err) {
    alert('Could not upload image: ' + err.message);
    return;
  }

  const { error } = await supabaseClient.from('direct_messages').insert({
    sender_id: currentUser.id,
    recipient_id: activeDmPartnerId,
    content: content || '📎 Image',
    image_url,
  });
  if (error) { alert('Could not send: ' + error.message); return; }
  input.value = '';
  clearPendingImage('dm');
  loadDmThread();
}

// ================= INTRO GATE =================
function initIntroGate() {
  const composer = document.getElementById('composer-intro-gate');
  const textarea = composer.querySelector('textarea');
  const titleInput = composer.querySelector('.title-input');
  const countEl = composer.querySelector('.char-count');
  const submitBtn = document.getElementById('intro-gate-submit');
  const footer = composer.querySelector('.composer-footer');

  textarea.addEventListener('input', () => {
    countEl.textContent = `${textarea.value.length} / 2000`;
  });
  attachMentionAutocomplete(textarea);
  setupImageAttach('intro-gate', footer, submitBtn, composer, footer);

  submitBtn.addEventListener('click', async () => {
    const content = textarea.value.trim();
    const title = titleInput.value.trim();
    if (!content) return;
    submitBtn.disabled = true;

    let image_url = null;
    try {
      if (pendingImages['intro-gate']) image_url = await uploadAttachment(pendingImages['intro-gate']);
    } catch (err) {
      submitBtn.disabled = false;
      alert('Could not upload image: ' + err.message);
      return;
    }

    const { error } = await supabaseClient.from('posts').insert({
      user_id: currentUser.id, channel: 'introductions', content, title: title || null, image_url,
    });
    submitBtn.disabled = false;
    if (error) { alert('Could not post: ' + error.message); return; }
    textarea.value = '';
    titleInput.value = '';
    countEl.textContent = '0 / 2000';
    clearPendingImage('intro-gate');
    loadChannel('introductions');
    checkIntroStatus();
  });
}

async function checkIntroStatus() {
  const { data } = await supabaseClient
    .from('posts')
    .select('id')
    .eq('channel', 'introductions')
    .eq('user_id', currentUser.id)
    .limit(1);

  hasIntroduced = !!(data && data.length);
  document.getElementById('intro-gate-overlay').classList.toggle('hidden', hasIntroduced);
  if (!hasIntroduced) loadIntroGateFeed();
}

async function loadIntroGateFeed() {
  const { data: posts } = await supabaseClient
    .from('posts')
    .select('id, title, content, image_url, created_at, profiles(name, avatar_url)')
    .eq('channel', 'introductions')
    .order('created_at', { ascending: false })
    .limit(30);

  const feedEl = document.getElementById('intro-gate-feed');
  if (!posts || !posts.length) {
    feedEl.innerHTML = `<div class="empty-state">Be the first to introduce yourself.</div>`;
    return;
  }
  feedEl.innerHTML = posts.map(post => `
    <div class="post-card">
      <div class="post-meta">
        <div class="post-author-row static">
          ${avatarHtml(post.profiles, 'small')}
          <span class="post-author">${escapeHtml(post.profiles ? post.profiles.name : 'Member')}</span>
        </div>
        <span class="post-time">${formatTime(post.created_at)}</span>
      </div>
      ${post.title ? `<div class="post-title">${escapeHtml(post.title)}</div>` : ''}
      <div class="post-content">${mentionify(linkify(escapeHtml(post.content)))}</div>${attachmentImgHtml(post.image_url)}
    </div>
  `).join('');
}

// ================= MILESTONES =================
let celebratingInFlight = false;

async function maybeCelebrateMilestone(currentLevel) {
  if (!currentProfile || celebratingInFlight) return;
  const stored = currentProfile.last_celebrated_level;

  if (!stored) {
    // First time we've ever computed this — just record the baseline, no post.
    // Prevents a flood of "leveled up" posts for everyone's existing streaks the moment this feature ships.
    currentProfile.last_celebrated_level = currentLevel.name;
    await supabaseClient.from('profiles').update({ last_celebrated_level: currentLevel.name }).eq('id', currentUser.id);
    return;
  }

  if (stored === currentLevel.name) return;

  const prevIndex = LEVELS.findIndex(l => l.name === stored);
  const newIndex = LEVELS.findIndex(l => l.name === currentLevel.name);
  if (newIndex <= prevIndex || currentLevel.min === 0) return; // only celebrate genuine level-ups, never Rookie

  celebratingInFlight = true;
  try {
    await supabaseClient.from('posts').insert({
      user_id: currentUser.id,
      channel: 'wins',
      title: `Leveled up: ${currentLevel.name}`,
      content: `🎉 Just hit ${currentLevel.name} status with a ${currentLevel.min}+ day streak on the Command Center. Consistency compounding.`,
    });
    currentProfile.last_celebrated_level = currentLevel.name;
    await supabaseClient.from('profiles').update({ last_celebrated_level: currentLevel.name }).eq('id', currentUser.id);
    if (!document.getElementById('view-wins').classList.contains('hidden')) loadChannel('wins');
  } finally {
    celebratingInFlight = false;
  }
}

// ================= LEADERBOARD =================
async function loadLeaderboard() {
  const listEl = document.getElementById('leaderboard-list');
  listEl.innerHTML = skeletonHtml();

  const [{ data: members }, { data: allCheckins }] = await Promise.all([
    supabaseClient.from('profiles').select('id, name, avatar_url'),
    supabaseClient.from('checkins').select('user_id, checkin_date, completed').order('checkin_date', { ascending: false }),
  ]);

  if (!members || !members.length) {
    listEl.innerHTML = `<div class="empty-state">No members yet.</div>`;
    return;
  }

  const ranked = members.map(member => {
    const rows = (allCheckins || []).filter(r => r.user_id === member.id);
    const { streak, currentLevel } = computeStreakAndLevel(rows);
    return { member, streak, level: currentLevel.name };
  }).sort((a, b) => b.streak - a.streak);

  listEl.innerHTML = ranked.map((entry, idx) => `
    <div class="leaderboard-row ${entry.member.id === currentUser.id ? 'mine' : ''}">
      <span class="leaderboard-rank">${idx + 1}</span>
      ${avatarHtml(entry.member, 'small')}
      <span class="leaderboard-name">${escapeHtml(entry.member.name)}${entry.member.id === currentUser.id ? ' (you)' : ''}</span>
      <span class="leaderboard-level">${escapeHtml(entry.level)}</span>
      <span class="leaderboard-streak">${entry.streak} <span class="leaderboard-streak-label">day${entry.streak === 1 ? '' : 's'}</span></span>
    </div>
  `).join('');
}

// ================= ADMIN =================
async function loadAdminPanel() {
  if (!currentProfile || !currentProfile.is_admin) return;
  const listEl = document.getElementById('admin-member-list');
  listEl.innerHTML = skeletonHtml();

  const [{ data: members }, { data: intros }] = await Promise.all([
    supabaseClient.from('profiles').select('id, name, avatar_url, can_announce, is_admin').order('name', { ascending: true }),
    supabaseClient.from('posts').select('user_id').eq('channel', 'introductions'),
  ]);

  const introducedIds = new Set((intros || []).map(p => p.user_id));

  listEl.innerHTML = (members || []).map(m => `
    <div class="admin-row">
      ${avatarHtml(m, 'small')}
      <span class="admin-name">${escapeHtml(m.name)}${m.id === currentUser.id ? ' (you)' : ''}</span>
      <span class="admin-intro-badge ${introducedIds.has(m.id) ? 'yes' : 'no'}">${introducedIds.has(m.id) ? 'Introduced' : 'No intro yet'}</span>
      <label class="admin-toggle"><input type="checkbox" data-admin-field="can_announce" data-admin-member="${m.id}" ${m.can_announce ? 'checked' : ''} /> Can announce</label>
      <label class="admin-toggle"><input type="checkbox" data-admin-field="is_admin" data-admin-member="${m.id}" ${m.is_admin ? 'checked' : ''} /> Admin</label>
    </div>
  `).join('');

  listEl.querySelectorAll('[data-admin-field]').forEach(input => {
    input.addEventListener('change', async () => {
      const field = input.dataset.adminField;
      const memberId = input.dataset.adminMember;
      const { error } = await supabaseClient.from('profiles').update({ [field]: input.checked }).eq('id', memberId);
      if (error) { alert('Could not update: ' + error.message); input.checked = !input.checked; }
    });
  });
}

// ================= @MENTIONS =================
function getAllMentionableMembers() {
  const list = [...allMembers];
  if (currentProfile) list.push({ id: currentUser.id, name: currentProfile.name, avatar_url: currentProfile.avatar_url });
  return list;
}

function mentionify(escapedHtml) {
  const names = getAllMentionableMembers().map(m => m.name).filter(Boolean);
  if (!names.length) return escapedHtml;
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const pattern = sorted.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`@(${pattern})\\b`, 'g');
  return escapedHtml.replace(regex, (match, name) => `<span class="mention">@${name}</span>`);
}

let mentionDropdownEl = null;

function ensureMentionDropdown() {
  if (mentionDropdownEl) return mentionDropdownEl;
  mentionDropdownEl = document.createElement('div');
  mentionDropdownEl.className = 'mention-dropdown hidden';
  document.body.appendChild(mentionDropdownEl);
  return mentionDropdownEl;
}

function attachMentionAutocomplete(inputEl) {
  if (!inputEl || inputEl.dataset.mentionBound) return;
  inputEl.dataset.mentionBound = 'true';
  inputEl.addEventListener('input', () => handleMentionInput(inputEl));
  inputEl.addEventListener('blur', () => setTimeout(hideMentionDropdown, 150));
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMentionDropdown(); });
}

function handleMentionInput(inputEl) {
  const value = inputEl.value;
  const cursor = inputEl.selectionStart;
  const upToCursor = value.slice(0, cursor);
  const match = upToCursor.match(/@([A-Za-z0-9._' -]{0,40})$/);
  if (!match) { hideMentionDropdown(); return; }
  const fragment = match[1].toLowerCase();
  const candidates = getAllMentionableMembers().filter(m => m.name.toLowerCase().includes(fragment)).slice(0, 6);
  if (!candidates.length) { hideMentionDropdown(); return; }
  showMentionDropdown(inputEl, candidates, match[0].length);
}

function showMentionDropdown(inputEl, candidates, matchLength) {
  const dropdown = ensureMentionDropdown();
  const rect = inputEl.getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.width = `${Math.max(180, Math.min(260, rect.width))}px`;
  dropdown.dataset.matchLength = matchLength;
  dropdown.innerHTML = candidates.map(m => `
    <button type="button" class="mention-option" data-name="${escapeHtml(m.name)}">
      ${avatarHtml(m, 'small')}<span>${escapeHtml(m.name)}</span>
    </button>
  `).join('');
  dropdown.classList.remove('hidden');
  dropdown.querySelectorAll('.mention-option').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      insertMention(inputEl, btn.dataset.name, Number(dropdown.dataset.matchLength));
    });
  });
}

function hideMentionDropdown() {
  if (mentionDropdownEl) mentionDropdownEl.classList.add('hidden');
}

function insertMention(inputEl, name, matchLength) {
  const cursor = inputEl.selectionStart;
  const value = inputEl.value;
  const before = value.slice(0, cursor - matchLength);
  const after = value.slice(cursor);
  const insertion = `@${name} `;
  inputEl.value = before + insertion + after;
  const newCursor = (before + insertion).length;
  inputEl.focus();
  inputEl.setSelectionRange(newCursor, newCursor);
  hideMentionDropdown();
  inputEl.dispatchEvent(new Event('input'));
}

// ================= VIEW PROFILE (read-only, click any avatar/name) =================
function initProfileViewer() {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view-profile]');
    if (btn) showProfileModal(btn.dataset.viewProfile);
  });

  document.getElementById('view-profile-close').addEventListener('click', () => {
    document.getElementById('view-profile-overlay').classList.add('hidden');
  });
  document.getElementById('view-profile-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'view-profile-overlay') e.target.classList.add('hidden');
  });
}

async function showProfileModal(userId) {
  if (userId === currentUser.id) { document.getElementById('edit-profile-btn').click(); return; }

  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
  if (!profile) return;

  document.getElementById('view-profile-avatar').innerHTML = avatarInnerHtml(profile);
  document.getElementById('view-profile-name').textContent = profile.name;

  const bioEl = document.getElementById('view-profile-bio');
  bioEl.textContent = profile.bio || '';
  bioEl.classList.toggle('hidden', !profile.bio);

  const igEl = document.getElementById('view-profile-ig');
  if (profile.instagram_url) {
    igEl.href = profile.instagram_url;
    igEl.classList.remove('hidden');
  } else {
    igEl.classList.add('hidden');
  }

  const msgBtn = document.getElementById('view-profile-message-btn');
  msgBtn.classList.remove('hidden');
  msgBtn.onclick = () => {
    document.getElementById('view-profile-overlay').classList.add('hidden');
    switchView('messages');
    openDmThread(userId);
  };

  document.getElementById('view-profile-overlay').classList.remove('hidden');
}

// ================= REALTIME =================
function subscribeRealtime() {
  supabaseClient.channel('p2p-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
      const channel = payload.new?.channel || payload.old?.channel;
      if (channel) loadChannel(channel);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
      ['wins', 'board', 'announcements', 'introductions'].forEach(loadChannel);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => {
      ['wins', 'board', 'announcements', 'introductions'].forEach(loadChannel);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadChat())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
      loadDmConversations();
      if (activeDmPartnerId) loadDmThread();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => {
      if (!document.getElementById('view-leaderboard').classList.contains('hidden')) loadLeaderboard();
    })
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

function skeletonHtml() {
  return Array.from({ length: 3 }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-line skeleton-w40"></div>
      <div class="skeleton-line skeleton-w90"></div>
      <div class="skeleton-line skeleton-w60"></div>
    </div>
  `).join('');
}

function animateNumber(el, target) {
  const start = Number(el.textContent) || 0;
  if (start === target) { el.textContent = target; return; }
  const duration = 500;
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function avatarHtml(profile, sizeClass = '') {
  const name = profile && profile.name ? profile.name : '?';
  const initial = escapeHtml(name.trim().charAt(0).toUpperCase() || '?');
  if (profile && profile.avatar_url) {
    return `<div class="avatar-circle ${sizeClass}"><img src="${escapeHtml(profile.avatar_url)}" alt="${initial}" /></div>`;
  }
  return `<div class="avatar-circle ${sizeClass}">${initial}</div>`;
}

function linkify(escapedHtml) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  return escapedHtml.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}
