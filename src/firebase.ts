export interface SubtaskItem {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  dueDateIso?: string; // "YYYY-MM-DD"
  repeatDaily?: boolean;
  recurringSeriesId?: string;
  createdAt: string;
  monthKey: string; // e.g. "2026-11"
  dateKey: string;  // e.g. "2026-11-18"
  expanded: boolean;
  subtasks: SubtaskItem[];
}

export interface DateBucket {
  dateKey: string;       // "2026-11-18"
  displayDate: string;   // "Nov 18, 2026"
  tasks: TaskItem[];
}

export interface MonthBucket {
  monthKey: string;      // "2026-11"
  displayMonth: string;  // "Nov 2026"
  dates: Record<string, DateBucket>;
}

export interface UserProfileData {
  uid: string;
  email: string;
  name: string;
  profilePicture: string;
  role: string;
  country: string;
  state: string;
  location: string;
  bio: string;
  openForWork: boolean;
  rankNumber: number;
  tasksCompleted: number;
  totalTasksCount: number;
  completionRate: number;
  streakDays: number;
  productiveDaysCount: number;
  completedDatesInMonth: Record<string, number[]>;
  months: Record<string, MonthBucket>;
  isSubscribed?: boolean;
  subscribedAt?: string;
  createdAt: string;
}

export const FREE_DAILY_TASK_LIMIT = 10;
export const SUBSCRIPTION_PRICE_MONTHLY = '$1.99';

export const DEFAULT_DEMO_AVATAR = '/assets/Demo_profile.png';

// Live Firebase SDK configuration for project taskora-c7f0b
export const firebaseConfig = {
  projectId: 'taskora-c7f0b',
  appId: '1:215759898954:web:093eeba75aa9eb216dd9b3',
  storageBucket: 'taskora-c7f0b.firebasestorage.app',
  apiKey: 'AIzaSyCwwFymSi_GASrSnypH2GeezbJLivORT54',
  authDomain: 'taskora-c7f0b.firebaseapp.com',
  messagingSenderId: '215759898954',
  measurementId: 'G-NGDQ078RB4',
};

export const isFirebaseCloudConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

const USERS_STORAGE_KEY = 'taskora_firebase_users_v2';
const SESSION_UID_KEY = 'taskora_firebase_session_uid_v2';
const CREDENTIALS_KEY = 'taskora_firebase_creds_v2';

function loadLocalUsers(): Record<string, UserProfileData> {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: Record<string, UserProfileData> = JSON.parse(raw);
    let migrated = false;
    Object.values(parsed).forEach((u) => {
      if (!u.profilePicture || u.profilePicture === '/assets/b5198.png') {
        u.profilePicture = DEFAULT_DEMO_AVATAR;
        migrated = true;
      }
      if (
        !u.bio ||
        u.bio === 'Building better habits and mastering daily momentum on Taskora.'
      ) {
        u.bio = 'Here your bio!';
        migrated = true;
      }
    });
    if (migrated) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return {};
  }
}

function saveLocalUsers(users: Record<string, UserProfileData>) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('taskora-db-updated'));
  } catch {
    // ignore storage errors
  }
}

function loadCredentials(): Record<string, { uid: string; password: string }> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCredentials(creds: Record<string, { uid: string; password: string }>) {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  } catch {
    // ignore
  }
}

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatIsoDateToDisplay(isoDate: string): string {
  // isoDate: "YYYY-MM-DD" -> "18 Nov 2026"
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const mName = MONTH_NAMES_SHORT[monthIdx] || 'Nov';
  return `${day} ${mName} ${year}`;
}

export function getMonthAndDateKeys(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const monthIdx = dateObj.getMonth();
  const day = dateObj.getDate();
  const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  const displayMonth = `${MONTH_NAMES_SHORT[monthIdx]} ${year}`;
  const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`;
  const displayDate = `${MONTH_NAMES_SHORT[monthIdx]} ${day}, ${year}`;
  return { year, monthIdx, day, monthKey, displayMonth, dateKey, displayDate };
}

/**
 * Checks whether an incomplete task is locked because more than 12 hours
 * have passed since the end of its due deadline date.
 */
export function isTaskLockedAfter12Hours(task: TaskItem): boolean {
  const subs = task.subtasks || [];
  const isCompleted = subs.length > 0 && subs.every((s) => s.done);
  if (isCompleted) return false;

  let dueIso = task.dueDateIso;
  if (!dueIso && task.dueDate) {
    // Try parsing "Due 18 Nov 2026" or "18 Nov 2026"
    const clean = task.dueDate.replace(/^Due\s+/i, '').trim();
    const parsed = Date.parse(clean);
    if (!Number.isNaN(parsed)) {
      const d = new Date(parsed);
      dueIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    }
  }
  if (!dueIso) return false;

  const parts = dueIso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;

  // End of due date (23:59:59.999 local time) + 12 hours grace period
  const dueDateEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
  const lockThresholdMs = dueDateEnd + 12 * 60 * 60 * 1000;
  return Date.now() > lockThresholdMs;
}

/**
 * Recalculates a user's dynamic stats (tasksCompleted, completionRate, streakDays,
 * productiveDaysCount, completedDatesInMonth) from their hierarchical
 * months -> dates -> tasks -> subtasks structure, and updates all users' rankNumber!
 */
export function recalculateUserMetricsAndRanks(
  usersMap: Record<string, UserProfileData>
): Record<string, UserProfileData> {
  const updatedMap: Record<string, UserProfileData> = { ...usersMap };
  const {
    monthKey: todayMonthKey,
    displayMonth: todayDisplayMonth,
    dateKey: todayDateKey,
    displayDate: todayDisplayDate,
  } = getMonthAndDateKeys();

  Object.values(updatedMap).forEach((user) => {
    // 1. Auto-generate today's instance for any active repeatDaily tasks from previous dates
    const activeRecurringTemplates = new Map<string, TaskItem>();
    Object.values(user.months || {}).forEach((mBucket) => {
      Object.values(mBucket.dates || {}).forEach((dBucket) => {
        (dBucket.tasks || []).forEach((task) => {
          if (task.repeatDaily) {
            const key =
              task.recurringSeriesId || `title_${task.title.trim().toLowerCase()}`;
            const existing = activeRecurringTemplates.get(key);
            if (!existing || dBucket.dateKey >= existing.dateKey) {
              activeRecurringTemplates.set(key, task);
            }
          }
        });
      });
    });

    if (activeRecurringTemplates.size > 0) {
      const monthsCopy = { ...(user.months || {}) };
      const todayMonthBucket: MonthBucket = monthsCopy[todayMonthKey]
        ? {
            ...monthsCopy[todayMonthKey],
            dates: { ...monthsCopy[todayMonthKey].dates },
          }
        : {
            monthKey: todayMonthKey,
            displayMonth: todayDisplayMonth,
            dates: {},
          };

      const todayDateBucket: DateBucket = todayMonthBucket.dates[todayDateKey]
        ? {
            ...todayMonthBucket.dates[todayDateKey],
            tasks: [...todayMonthBucket.dates[todayDateKey].tasks],
          }
        : {
            dateKey: todayDateKey,
            displayDate: todayDisplayDate,
            tasks: [],
          };

      let addedAnyRecurringToday = false;
      activeRecurringTemplates.forEach((templateTask, seriesKey) => {
        if (templateTask.dateKey < todayDateKey) {
          const alreadyExistsToday = todayDateBucket.tasks.some(
            (t) =>
              (t.recurringSeriesId && t.recurringSeriesId === seriesKey) ||
              t.title.trim().toLowerCase() ===
                templateTask.title.trim().toLowerCase()
          );
          if (!alreadyExistsToday) {
            const generatedTask: TaskItem = {
              id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              title: templateTask.title,
              dueDate: `Due ${formatIsoDateToDisplay(todayDateKey)}`,
              dueDateIso: todayDateKey,
              repeatDaily: true,
              recurringSeriesId: seriesKey,
              createdAt: new Date().toISOString(),
              monthKey: todayMonthKey,
              dateKey: todayDateKey,
              expanded: true,
              subtasks: (templateTask.subtasks || []).map((st, idx) => ({
                id: `sub_${Date.now()}_${idx}`,
                title: st.title,
                done: false,
              })),
            };
            todayDateBucket.tasks = [generatedTask, ...todayDateBucket.tasks];
            addedAnyRecurringToday = true;
          }
        }
      });

      if (addedAnyRecurringToday) {
        todayMonthBucket.dates[todayDateKey] = todayDateBucket;
        monthsCopy[todayMonthKey] = todayMonthBucket;
        user = {
          ...user,
          months: monthsCopy,
        };
      }
    }

    let totalTasks = 0;
    let completedTasks = 0;
    const completedDatesByMonth: Record<string, Set<number>> = {};
    const allCompletedDateStrings = new Set<string>();

    Object.values(user.months || {}).forEach((monthBucket) => {
      if (!completedDatesByMonth[monthBucket.monthKey]) {
        completedDatesByMonth[monthBucket.monthKey] = new Set<number>();
      }
      Object.values(monthBucket.dates || {}).forEach((dateBucket) => {
        const dayNum = Number(dateBucket.dateKey.split('-')[2] || 0);
        let anyCompletedOnDate = false;

        (dateBucket.tasks || []).forEach((task) => {
          totalTasks += 1;
          const subs = task.subtasks || [];
          const isTaskDone = subs.length > 0 ? subs.every((s) => s.done) : false;
          if (isTaskDone) {
            completedTasks += 1;
            anyCompletedOnDate = true;
          }
        });

        if (anyCompletedOnDate && dayNum > 0) {
          completedDatesByMonth[monthBucket.monthKey].add(dayNum);
          allCompletedDateStrings.add(dateBucket.dateKey);
        }
      });
    });

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const serializedCompletedDates: Record<string, number[]> = {};
    let currentMonthProductiveDays = 0;
    const { monthKey: currentMonthKey } = getMonthAndDateKeys();

    Object.entries(completedDatesByMonth).forEach(([mKey, daySet]) => {
      const arr = Array.from(daySet).sort((a, b) => a - b);
      serializedCompletedDates[mKey] = arr;
      if (mKey === currentMonthKey) {
        currentMonthProductiveDays = arr.length;
      }
    });

    const streakDays = allCompletedDateStrings.size;

    updatedMap[user.uid] = {
      ...user,
      tasksCompleted: completedTasks,
      totalTasksCount: totalTasks,
      completionRate,
      streakDays,
      productiveDaysCount: currentMonthProductiveDays,
      completedDatesInMonth: serializedCompletedDates,
    };
  });

  // Dynamically rank all users by tasksCompleted DESC, then completionRate DESC
  const sortedUsers = Object.values(updatedMap).sort((a, b) => {
    if (b.tasksCompleted !== a.tasksCompleted) {
      return b.tasksCompleted - a.tasksCompleted;
    }
    if (b.completionRate !== a.completionRate) {
      return b.completionRate - a.completionRate;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });

  sortedUsers.forEach((u, index) => {
    updatedMap[u.uid] = {
      ...updatedMap[u.uid],
      rankNumber: index + 1,
    };
  });

  return updatedMap;
}

/**
 * Computes leaderboard rankings specifically for a selected Month ("YYYY-MM").
 * If no users have any data/tasks in that month, returns [] so the Leaderboard
 * displays "Empty Leaderboard".
 */
export function getRankedUsersForMonth(targetMonthKey: string): UserProfileData[] {
  const users = recalculateUserMetricsAndRanks(loadLocalUsers());
  const monthCandidates: UserProfileData[] = [];

  Object.values(users).forEach((user) => {
    const monthBucket = user.months?.[targetMonthKey];
    const userCreatedMonthKey = user.createdAt ? user.createdAt.slice(0, 7) : '';

    let monthTotalTasks = 0;
    let monthCompletedTasks = 0;
    let monthStreakDays = 0;

    if (monthBucket && monthBucket.dates) {
      Object.values(monthBucket.dates).forEach((dBucket) => {
        let anyDoneOnDate = false;
        (dBucket.tasks || []).forEach((task) => {
          monthTotalTasks += 1;
          const subs = task.subtasks || [];
          const isTaskDone = subs.length > 0 && subs.every((s) => s.done);
          if (isTaskDone) {
            monthCompletedTasks += 1;
            anyDoneOnDate = true;
          } else if (subs.some((s) => s.done)) {
            anyDoneOnDate = true;
          }
        });
        if (anyDoneOnDate) {
          monthStreakDays += 1;
        }
      });
    }

    // Include user in this month's leaderboard only if they have tasks in this month
    // OR they registered in this month
    if (monthTotalTasks > 0 || userCreatedMonthKey === targetMonthKey) {
      const monthCompletionRate =
        monthTotalTasks > 0
          ? Math.round((monthCompletedTasks / monthTotalTasks) * 100)
          : 0;
      monthCandidates.push({
        ...user,
        tasksCompleted: monthCompletedTasks,
        totalTasksCount: monthTotalTasks,
        completionRate: monthCompletionRate,
        streakDays: monthStreakDays,
      });
    }
  });

  // If no user has any activity or registration in this month, return empty array
  if (monthCandidates.length === 0) {
    return [];
  }

  monthCandidates.sort((a, b) => {
    if (b.tasksCompleted !== a.tasksCompleted) {
      return b.tasksCompleted - a.tasksCompleted;
    }
    if (b.completionRate !== a.completionRate) {
      return b.completionRate - a.completionRate;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });

  return monthCandidates.map((u, idx) => ({
    ...u,
    rankNumber: idx + 1,
  }));
}

export async function syncUserToFirestore(user: UserProfileData) {
  if (!isFirebaseCloudConfigured) return;
  try {
    const requests: Promise<Response>[] = [];
    const userDocUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${user.uid}?key=${firebaseConfig.apiKey}`;
    requests.push(
      fetch(userDocUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            uid: { stringValue: user.uid },
            email: { stringValue: user.email },
            name: { stringValue: user.name },
            profilePicture: { stringValue: user.profilePicture },
            role: { stringValue: user.role },
            country: { stringValue: user.country },
            state: { stringValue: user.state },
            location: { stringValue: user.location },
            bio: { stringValue: user.bio },
            openForWork: { booleanValue: user.openForWork },
            isSubscribed: { booleanValue: Boolean(user.isSubscribed) },
            rankNumber: { integerValue: String(user.rankNumber) },
            tasksCompleted: { integerValue: String(user.tasksCompleted) },
            completionRate: { integerValue: String(user.completionRate) },
            streakDays: { integerValue: String(user.streakDays) },
            payloadJson: { stringValue: JSON.stringify(user) },
          },
        }),
      })
    );

    for (const [mKey, monthObj] of Object.entries(user.months || {})) {
      const monthUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${user.uid}/months/${mKey}?key=${firebaseConfig.apiKey}`;
      requests.push(
        fetch(monthUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              monthKey: { stringValue: monthObj.monthKey },
              displayMonth: { stringValue: monthObj.displayMonth },
            },
          }),
        })
      );

      for (const [dKey, dateObj] of Object.entries(monthObj.dates || {})) {
        const dateUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${user.uid}/months/${mKey}/dates/${dKey}?key=${firebaseConfig.apiKey}`;
        requests.push(
          fetch(dateUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                dateKey: { stringValue: dateObj.dateKey },
                displayDate: { stringValue: dateObj.displayDate },
                tasksJson: { stringValue: JSON.stringify(dateObj.tasks || []) },
              },
            }),
          })
        );
      }
    }

    await Promise.all(requests);
  } catch {
    // fallback silently to local store
  }
}

export async function fetchAllUsersFromFirestore(): Promise<void> {
  if (!isFirebaseCloudConfigured) return;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents)) return;

    const localUsers = loadLocalUsers();
    let changed = false;
    for (const docItem of data.documents) {
      const payloadStr = docItem.fields?.payloadJson?.stringValue;
      if (payloadStr) {
        try {
          const parsed = JSON.parse(payloadStr) as UserProfileData;
          if (parsed && parsed.uid) {
            localUsers[parsed.uid] = parsed;
            changed = true;
          }
        } catch {
          // ignore malformed payload
        }
      }
    }
    if (changed) {
      const recalculated = recalculateUserMetricsAndRanks(localUsers);
      saveLocalUsers(recalculated);
    }
  } catch {
    // ignore offline error
  }
}

export async function registerUserAccount(params: {
  name: string;
  email: string;
  role: string;
  country: string;
  state: string;
  password: string;
}): Promise<UserProfileData> {
  const cleanEmail = params.email.trim().toLowerCase();
  let uid = `user_${Date.now()}`;

  if (isFirebaseCloudConfigured) {
    try {
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: params.password,
            returnSecureToken: true,
          }),
        }
      );
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.localId) {
          uid = authData.localId;
        }
      }
    } catch {
      // continue with local UID
    }
  }

  const creds = loadCredentials();
  if (creds[cleanEmail]) {
    throw new Error('An account with this email already exists.');
  }
  creds[cleanEmail] = { uid, password: params.password };
  saveCredentials(creds);

  const { monthKey, displayMonth } = getMonthAndDateKeys();
  const location = `${params.state.trim()}, ${params.country.trim()}`;

  const newUser: UserProfileData = {
    uid,
    email: cleanEmail,
    name: params.name.trim(),
    profilePicture: DEFAULT_DEMO_AVATAR,
    role: params.role.trim() || 'Professional',
    country: params.country.trim(),
    state: params.state.trim(),
    location,
    bio: 'Here your bio!',
    openForWork: true,
    rankNumber: 1,
    tasksCompleted: 0,
    totalTasksCount: 0,
    completionRate: 0,
    streakDays: 0,
    productiveDaysCount: 0,
    completedDatesInMonth: { [monthKey]: [] },
    months: {
      [monthKey]: {
        monthKey,
        displayMonth,
        dates: {},
      },
    },
    createdAt: new Date().toISOString(),
  };

  const users = loadLocalUsers();
  users[uid] = newUser;
  const recalculated = recalculateUserMetricsAndRanks(users);
  saveLocalUsers(recalculated);
  localStorage.setItem(SESSION_UID_KEY, uid);

  await syncUserToFirestore(recalculated[uid]);
  return recalculated[uid];
}

export async function signInUserAccount(
  emailOrUsername: string,
  password: string
): Promise<UserProfileData> {
  const cleanInput = emailOrUsername.trim().toLowerCase();
  await fetchAllUsersFromFirestore();

  const creds = loadCredentials();
  const users = loadLocalUsers();

  let targetEmail = cleanInput;
  const foundUserByEmailOrName = Object.values(users).find(
    (u) =>
      u.email.toLowerCase() === cleanInput ||
      u.name.toLowerCase() === cleanInput
  );
  if (foundUserByEmailOrName) {
    targetEmail = foundUserByEmailOrName.email.toLowerCase();
  }

  let matchedUid: string | null = null;

  if (isFirebaseCloudConfigured && targetEmail.includes('@')) {
    try {
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            password,
            returnSecureToken: true,
          }),
        }
      );
      if (authRes.ok) {
        const authData = await authRes.json();
        const fbUid = authData.localId;
        if (fbUid && users[fbUid]) {
          matchedUid = fbUid;
        } else if (foundUserByEmailOrName) {
          matchedUid = foundUserByEmailOrName.uid;
        }
        if (matchedUid) {
          creds[targetEmail] = { uid: matchedUid, password };
          saveCredentials(creds);
        }
      } else {
        const errData = await authRes.json().catch(() => null);
        const errMsg = errData?.error?.message || '';
        if (
          errMsg.includes('INVALID_LOGIN_CREDENTIALS') ||
          errMsg.includes('INVALID_PASSWORD')
        ) {
          throw new Error('Incorrect password. Please try again or use Forgot Password.');
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('Incorrect password')) {
        throw e;
      }
    }
  }

  if (!matchedUid) {
    if (creds[targetEmail] && creds[targetEmail].password === password) {
      matchedUid = creds[targetEmail].uid;
    } else if (foundUserByEmailOrName) {
      const c = creds[targetEmail];
      if (c && c.password === password) {
        matchedUid = foundUserByEmailOrName.uid;
      }
    }
  }

  if (!matchedUid || !users[matchedUid]) {
    throw new Error('Invalid email/username or password.');
  }

  localStorage.setItem(SESSION_UID_KEY, matchedUid);
  return users[matchedUid];
}

export async function signOutUserAccount() {
  localStorage.removeItem(SESSION_UID_KEY);
  window.dispatchEvent(new CustomEvent('taskora-db-updated'));
}

export async function sendFirebasePasswordResetLink(
  emailOrUsername: string
): Promise<string> {
  const cleanInput = emailOrUsername.trim().toLowerCase();
  if (!cleanInput) {
    throw new Error('Please enter your registered email address.');
  }

  await fetchAllUsersFromFirestore();
  const creds = loadCredentials();
  const users = loadLocalUsers();

  let targetEmail = cleanInput;
  const foundUser = Object.values(users).find(
    (u) =>
      u.email.toLowerCase() === cleanInput ||
      u.name.toLowerCase() === cleanInput
  );
  if (foundUser) {
    targetEmail = foundUser.email.toLowerCase();
  }

  if (!targetEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  if (!isFirebaseCloudConfigured) {
    throw new Error('Firebase is not configured.');
  }

  const localCredPassword = creds[targetEmail]?.password || 'TaskoraTemp123!';
  try {
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          password: localCredPassword,
          returnSecureToken: true,
        }),
      }
    );
  } catch {
    // Account may already exist in Firebase Auth — continue
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: targetEmail,
      }),
    }
  );

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    const code = errJson?.error?.message || '';
    if (code.includes('CONFIGURATION_NOT_FOUND') || code.includes('OPERATION_NOT_ALLOWED')) {
      throw new Error(
        'Please enable Email/Password sign-in in your Firebase Console (Authentication > Sign-in method).'
      );
    }
    if (code.includes('EMAIL_NOT_FOUND')) {
      throw new Error('No registered account found with that email address.');
    }
    throw new Error(code || 'Failed to send password reset email.');
  }

  return targetEmail;
}

export function getCurrentSessionUser(): UserProfileData | null {
  const uid = localStorage.getItem(SESSION_UID_KEY);
  if (!uid) return null;
  const users = recalculateUserMetricsAndRanks(loadLocalUsers());
  return users[uid] || null;
}

export function getAllRankedUsers(): UserProfileData[] {
  const users = recalculateUserMetricsAndRanks(loadLocalUsers());
  return Object.values(users).sort((a, b) => a.rankNumber - b.rankNumber);
}

export async function updateUserProfileFields(
  uid: string,
  updates: Partial<UserProfileData>
): Promise<UserProfileData | null> {
  const users = loadLocalUsers();
  if (!users[uid]) return null;

  users[uid] = {
    ...users[uid],
    ...updates,
  };
  const recalculated = recalculateUserMetricsAndRanks(users);
  saveLocalUsers(recalculated);
  await syncUserToFirestore(recalculated[uid]);
  return recalculated[uid];
}

export function getTodayNewTasksCount(
  user: UserProfileData | null,
  targetDate = new Date()
): number {
  if (!user || !user.months) return 0;
  const { monthKey, dateKey } = getMonthAndDateKeys(targetDate);
  return user.months?.[monthKey]?.dates?.[dateKey]?.tasks?.length || 0;
}

export async function activateUserSubscription(
  uid: string
): Promise<UserProfileData | null> {
  const users = loadLocalUsers();
  if (!users[uid]) return null;

  users[uid] = {
    ...users[uid],
    isSubscribed: true,
    subscribedAt: new Date().toISOString(),
  };

  const recalculated = recalculateUserMetricsAndRanks(users);
  saveLocalUsers(recalculated);
  await syncUserToFirestore(recalculated[uid]);
  return recalculated[uid];
}

export async function addTaskUnderMonthAndDate(
  uid: string,
  taskTitle: string,
  dueDateIso: string,
  subtasks: { id: string; title: string; done?: boolean }[],
  repeatDaily = false,
  targetDate = new Date()
): Promise<UserProfileData | null> {
  const users = loadLocalUsers();
  const user = users[uid];
  if (!user) return null;

  const { monthKey, displayMonth, dateKey, displayDate } =
    getMonthAndDateKeys(targetDate);

  const months = { ...(user.months || {}) };
  const monthBucket: MonthBucket = months[monthKey]
    ? { ...months[monthKey], dates: { ...months[monthKey].dates } }
    : { monthKey, displayMonth, dates: {} };

  const dateBucket: DateBucket = monthBucket.dates[dateKey]
    ? {
        ...monthBucket.dates[dateKey],
        tasks: [...monthBucket.dates[dateKey].tasks],
      }
    : { dateKey, displayDate, tasks: [] };

  if (!user.isSubscribed && dateBucket.tasks.length >= FREE_DAILY_TASK_LIMIT) {
    throw new Error('FREE_LIMIT_REACHED');
  }

  const formattedDueText = formatIsoDateToDisplay(dueDateIso);
  const seriesId = repeatDaily ? `series_${Date.now()}` : undefined;

  const newTask: TaskItem = {
    id: `task_${Date.now()}`,
    title: taskTitle.trim(),
    dueDate: `Due ${formattedDueText}`,
    dueDateIso,
    repeatDaily: Boolean(repeatDaily),
    recurringSeriesId: seriesId,
    createdAt: new Date().toISOString(),
    monthKey,
    dateKey,
    expanded: true,
    subtasks: subtasks.map((st) => ({
      id: st.id,
      title: st.title,
      done: Boolean(st.done),
    })),
  };

  dateBucket.tasks = [newTask, ...dateBucket.tasks];
  monthBucket.dates[dateKey] = dateBucket;
  months[monthKey] = monthBucket;

  users[uid] = {
    ...user,
    months,
  };

  const recalculated = recalculateUserMetricsAndRanks(users);
  saveLocalUsers(recalculated);
  await syncUserToFirestore(recalculated[uid]);
  return recalculated[uid];
}

export async function updateUserTask(
  uid: string,
  monthKey: string,
  dateKey: string,
  taskId: string,
  updates: {
    title: string;
    dueDateIso: string;
    repeatDaily: boolean;
    subtasks: { id: string; title: string; done?: boolean }[];
  }
): Promise<UserProfileData | null> {
  const users = loadLocalUsers();
  const user = users[uid];
  if (!user) return null;

  const months = { ...(user.months || {}) };
  const monthBucket = months[monthKey];
  if (!monthBucket || !monthBucket.dates[dateKey]) return user;

  const existingTask = (monthBucket.dates[dateKey].tasks || []).find(
    (t) => t.id === taskId
  );
  if (!existingTask) return user;

  const formattedDueText = formatIsoDateToDisplay(updates.dueDateIso);
  const seriesId = updates.repeatDaily
    ? existingTask.recurringSeriesId || `series_${Date.now()}`
    : undefined;

  const updatedTasks = (monthBucket.dates[dateKey].tasks || []).map((t) => {
    if (t.id !== taskId) return t;
    return {
      ...t,
      title: updates.title.trim(),
      dueDate: `Due ${formattedDueText}`,
      dueDateIso: updates.dueDateIso,
      repeatDaily: Boolean(updates.repeatDaily),
      recurringSeriesId: seriesId,
      subtasks: updates.subtasks.map((st) => ({
        id: st.id,
        title: st.title,
        done: Boolean(st.done),
      })),
    };
  });

  months[monthKey] = {
    ...monthBucket,
    dates: {
      ...monthBucket.dates,
      [dateKey]: {
        ...monthBucket.dates[dateKey],
        tasks: updatedTasks,
      },
    },
  };

  // If the user turned repeatDaily OFF, disable repeatDaily on any older instances of this series
  if (!updates.repeatDaily) {
    const oldSeriesId = existingTask.recurringSeriesId;
    const oldTitleLower = existingTask.title.trim().toLowerCase();
    Object.keys(months).forEach((mK) => {
      const mB = months[mK];
      const dMap = { ...(mB.dates || {}) };
      Object.keys(dMap).forEach((dK) => {
        const dB = dMap[dK];
        dMap[dK] = {
          ...dB,
          tasks: (dB.tasks || []).map((tk) => {
            if (
              (oldSeriesId && tk.recurringSeriesId === oldSeriesId) ||
              tk.title.trim().toLowerCase() === oldTitleLower
            ) {
              return { ...tk, repeatDaily: false };
            }
            return tk;
          }),
        };
      });
      months[mK] = { ...mB, dates: dMap };
    });
  }

  users[uid] = {
    ...user,
    months,
  };

  const recalculated = recalculateUserMetricsAndRanks(users);
  saveLocalUsers(recalculated);
  await syncUserToFirestore(recalculated[uid]);
  return recalculated[uid];
}

export async function deleteUserTask(
  uid: string,
  monthKey: string,
  dateKey: string,
  taskId: string
): Promise<UserProfileData | null> {
  const users = loadLocalUsers();
  const user = users[uid];
  if (!user) return null;

  const months = { ...(user.months || {}) };
  const monthBucket = months[monthKey];
  if (!monthBucket || !monthBucket.dates[dateKey]) return user;

  const filteredTasks = (monthBucket.dates[dateKey].tasks || []).filter(
    (t) => t.id !== taskId
  );

  months[monthKey] = {
    ...monthBucket,
    dates: {
      ...monthBucket.dates,
      [dateKey]: {
        ...monthBucket.dates[dateKey],
        tasks: filteredTasks,
      },
    },
  };

  users[uid] = {
    ...user,
    months,
  };

  const recalculated = recalculateUserMetricsAndRanks(users);
  saveLocalUsers(recalculated);
  await syncUserToFirestore(recalculated[uid]);
  return recalculated[uid];
}

export async function toggleUserSubtask(
  uid: string,
  monthKey: string,
  dateKey: string,
  taskId: string,
  subtaskId: string
): Promise<UserProfileData | null> {
  const users = loadLocalUsers();
  const user = users[uid];
  if (!user) return null;

  const months = { ...(user.months || {}) };
  const monthBucket = months[monthKey];
  if (!monthBucket || !monthBucket.dates[dateKey]) return user;

  const targetTask = monthBucket.dates[dateKey].tasks.find((t) => t.id === taskId);
  if (targetTask && isTaskLockedAfter12Hours(targetTask)) {
    throw new Error('This task is locked (more than 12 hours past its due deadline).');
  }

  const updatedTasks = monthBucket.dates[dateKey].tasks.map((t) => {
    if (t.id !== taskId) return t;
    return {
      ...t,
      subtasks: t.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, done: !s.done } : s
      ),
    };
  });

  months[monthKey] = {
    ...monthBucket,
    dates: {
      ...monthBucket.dates,
      [dateKey]: {
        ...monthBucket.dates[dateKey],
        tasks: updatedTasks,
      },
    },
  };

  users[uid] = {
    ...user,
    months,
  };

  const recalculated = recalculateUserMetricsAndRanks(users);
  saveLocalUsers(recalculated);
  await syncUserToFirestore(recalculated[uid]);
  return recalculated[uid];
}

export function toggleUserTaskExpanded(
  uid: string,
  monthKey: string,
  dateKey: string,
  taskId: string
): UserProfileData | null {
  const users = loadLocalUsers();
  const user = users[uid];
  if (!user) return null;

  const months = { ...(user.months || {}) };
  const monthBucket = months[monthKey];
  if (!monthBucket || !monthBucket.dates[dateKey]) return user;

  const updatedTasks = monthBucket.dates[dateKey].tasks.map((t) =>
    t.id === taskId ? { ...t, expanded: !t.expanded } : t
  );

  months[monthKey] = {
    ...monthBucket,
    dates: {
      ...monthBucket.dates,
      [dateKey]: {
        ...monthBucket.dates[dateKey],
        tasks: updatedTasks,
      },
    },
  };

  users[uid] = {
    ...user,
    months,
  };

  saveLocalUsers(users);
  return users[uid];
}

export function subscribeToRealtimeUpdates(callback: () => void) {
  const handler = () => callback();
  window.addEventListener('taskora-db-updated', handler);
  window.addEventListener('storage', handler);
  fetchAllUsersFromFirestore();
  return () => {
    window.removeEventListener('taskora-db-updated', handler);
    window.removeEventListener('storage', handler);
  };
}
