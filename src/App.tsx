import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfileData,
  TaskItem,
  DEFAULT_DEMO_AVATAR,
  FREE_DAILY_TASK_LIMIT,
  SUBSCRIPTION_PRICE_MONTHLY,
  MONTH_NAMES_SHORT,
  formatIsoDateToDisplay,
  getMonthAndDateKeys,
  isTaskLockedAfter12Hours,
  getTodayNewTasksCount,
  activateUserSubscription,
  getCurrentSessionUser,
  getRankedUsersForMonth,
  registerUserAccount,
  signInUserAccount,
  signOutUserAccount,
  sendFirebasePasswordResetLink,
  updateUserProfileFields,
  addTaskUnderMonthAndDate,
  updateUserTask,
  deleteUserTask,
  toggleUserSubtask,
  toggleUserTaskExpanded,
  subscribeToRealtimeUpdates,
} from './firebase';
import { ALL_COUNTRIES, getStatesForCountry } from './countriesData';

export type ScreenId =
  | 'entry'
  | 'tasks'
  | 'profile'
  | 'leaderboard'
  | 'create-task'
  | 'login'
  | 'signup'
  | 'guest-leaderboard';

export default function App() {
  const {
    year: currentYear,
    monthIdx: currentMonthIdx,
    day: todayDayNum,
    monthKey: currentMonthKey,
    displayMonth: currentDisplayMonth,
    dateKey: todayDateKey,
    displayDate: todayDisplayDate,
  } = getMonthAndDateKeys();

  const [activeScreen, setActiveScreen] = useState<ScreenId>('entry');
  const [currentUser, setCurrentUser] = useState<UserProfileData | null>(() =>
    getCurrentSessionUser()
  );

  // Selected Month for Leaderboard ("YYYY-MM")
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [showMonthPickerModal, setShowMonthPickerModal] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(currentYear);

  const [rankedUsers, setRankedUsers] = useState<UserProfileData[]>(() =>
    getRankedUsersForMonth(currentMonthKey)
  );

  // Filters & search
  const [taskFilter, setTaskFilter] = useState<'all' | 'due-soon' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global Anti-Double-Click Lock + Loading Spinner state
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const busyLockRef = useRef<string | null>(null);

  const runWithLoadingLock = async (
    actionKey: string,
    fn: () => Promise<void> | void
  ) => {
    if (busyLockRef.current) return;
    busyLockRef.current = actionKey;
    setBusyAction(actionKey);
    try {
      await Promise.all([
        Promise.resolve(fn()),
        new Promise((resolve) => setTimeout(resolve, 260)),
      ]);
    } finally {
      busyLockRef.current = null;
      setBusyAction(null);
    }
  };

  const renderSpinner = (
    sizeClass = 'size-[14px]',
    borderClass = 'border-white'
  ) => (
    <span
      className={`inline-block ${sizeClass} border-2 ${borderClass} border-t-transparent rounded-full animate-spin shrink-0`}
    />
  );

  // Subscription ($1.99/mo) & Direct Email Hire Contact Modal state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showContactEmailModal, setShowContactEmailModal] = useState(false);
  const [hireTargetUser, setHireTargetUser] = useState<UserProfileData | null>(null);

  // Create / Edit Task state
  const [editingTaskRef, setEditingTaskRef] = useState<{
    monthKey: string;
    dateKey: string;
    taskId: string;
  } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadlineIso, setNewTaskDeadlineIso] = useState<string>(todayDateKey);
  const [newTaskRepeatDaily, setNewTaskRepeatDaily] = useState<boolean>(false);
  const [draftSubtasks, setDraftSubtasks] = useState<
    { id: string; title: string; done?: boolean }[]
  >([]);
  const [showNewSubtaskCard, setShowNewSubtaskCard] = useState<boolean>(false);
  const [subtaskTitleInput, setSubtaskTitleInput] = useState('');

  // Popup Calendar Date Picker state for Task deadline
  const [calendarTarget, setCalendarTarget] = useState<'task' | null>(null);
  const [calViewYear, setCalViewYear] = useState<number>(currentYear);
  const [calViewMonth, setCalViewMonth] = useState<number>(currentMonthIdx); // 0..11
  const [calSelectedIso, setCalSelectedIso] = useState<string>(todayDateKey);

  // Edit Profile Modal state (with Photo Upload + Linked Country/State + Open For Work toggle)
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCountry, setEditCountry] = useState('United States');
  const [editState, setEditState] = useState('California');
  const [editPhoto, setEditPhoto] = useState('');
  const [editOpenForWork, setEditOpenForWork] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Leaderboard location filter state
  const [locationScope, setLocationScope] = useState<'local' | 'global'>('local');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('ALL');

  // Login & Signup state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot Password (Option 2: Firebase Password Reset Link) Modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotLinkSent, setForgotLinkSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState('');
  const [signupCountry, setSignupCountry] = useState('Bangladesh');
  const [signupState, setSignupState] = useState('Dhaka');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const refreshFromDatabase = (monthKeyOverride?: string) => {
    const mKey = monthKeyOverride || selectedMonthKey;
    const user = getCurrentSessionUser();
    const monthRanks = getRankedUsersForMonth(mKey);
    setCurrentUser(user);
    setRankedUsers(monthRanks);
  };

  useEffect(() => {
    refreshFromDatabase(selectedMonthKey);
  }, [selectedMonthKey]);

  useEffect(() => {
    const unsub = subscribeToRealtimeUpdates(() => {
      refreshFromDatabase(selectedMonthKey);
    });
    return unsub;
  }, [selectedMonthKey]);

  // Entry White Page automatic routing after 1.6s
  useEffect(() => {
    if (activeScreen !== 'entry') return;
    const timer = setTimeout(() => {
      const user = getCurrentSessionUser();
      if (user) {
        setCurrentUser(user);
        setActiveScreen('tasks');
      } else {
        setActiveScreen('guest-leaderboard');
      }
    }, 1600);
    return () => clearTimeout(timer);
  }, [activeScreen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Open Popup Calendar for Task Deadline
  const openCalendarPopup = () => {
    const currentIso = newTaskDeadlineIso;
    const parts = currentIso.split('-').map(Number);
    const y = parts[0] || currentYear;
    const m = (parts[1] || currentMonthIdx + 1) - 1;
    setCalViewYear(y);
    setCalViewMonth(m);
    setCalSelectedIso(currentIso);
    setCalendarTarget('task');
  };

  const confirmCalendarSelection = (isoDate: string) => {
    setNewTaskDeadlineIso(isoDate);
    setCalendarTarget(null);
  };

  const openEditProfileModal = () => {
    if (!currentUser) return;
    setEditName(currentUser.name);
    setEditRole(currentUser.role);
    setEditBio(currentUser.bio);
    const c = currentUser.country && ALL_COUNTRIES.includes(currentUser.country)
      ? currentUser.country
      : 'Bangladesh';
    const statesForC = getStatesForCountry(c);
    const s = currentUser.state && statesForC.includes(currentUser.state)
      ? currentUser.state
      : statesForC[0];
    setEditCountry(c);
    setEditState(s);
    setEditPhoto(currentUser.profilePicture || DEFAULT_DEMO_AVATAR);
    setEditOpenForWork(currentUser.openForWork);
    setEditingProfile(true);
  };

  const handleProfilePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setEditPhoto(dataUrl);
        } else {
          setEditPhoto(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    await runWithLoadingLock('save-profile', async () => {
      const formattedLoc = `${editState}, ${editCountry}`;
      const updated = await updateUserProfileFields(currentUser.uid, {
        name: editName.trim() || currentUser.name,
        role: editRole.trim() || currentUser.role,
        bio: editBio.trim(),
        country: editCountry,
        state: editState,
        location: formattedLoc,
        profilePicture: editPhoto || DEFAULT_DEMO_AVATAR,
        openForWork: editOpenForWork,
      });
      if (updated) {
        setCurrentUser(updated);
        refreshFromDatabase();
        setEditingProfile(false);
        showToast('Profile saved!');
      }
    });
  };

  const handleToggleOpenForWorkDirect = async () => {
    if (!currentUser) return;
    await runWithLoadingLock('toggle-work', async () => {
      const nextStatus = !currentUser.openForWork;
      const updated = await updateUserProfileFields(currentUser.uid, {
        openForWork: nextStatus,
      });
      if (updated) {
        setCurrentUser(updated);
        refreshFromDatabase();
        showToast(
          nextStatus ? 'Status set to Open For Work' : 'Status set to Not Available'
        );
      }
    });
  };

  // Gather all tasks for the logged-in user across months -> dates -> tasks
  const getUserTasksList = (): {
    task: TaskItem;
    monthKey: string;
    displayMonth: string;
    dateKey: string;
    displayDate: string;
  }[] => {
    if (!currentUser || !currentUser.months) return [];
    const list: {
      task: TaskItem;
      monthKey: string;
      displayMonth: string;
      dateKey: string;
      displayDate: string;
    }[] = [];

    const sortedMonths = Object.values(currentUser.months).sort((a, b) =>
      b.monthKey.localeCompare(a.monthKey)
    );
    sortedMonths.forEach((m) => {
      const sortedDates = Object.values(m.dates || {}).sort((a, b) =>
        b.dateKey.localeCompare(a.dateKey)
      );
      sortedDates.forEach((d) => {
        (d.tasks || []).forEach((task) => {
          list.push({
            task,
            monthKey: m.monthKey,
            displayMonth: m.displayMonth,
            dateKey: d.dateKey,
            displayDate: d.displayDate,
          });
        });
      });
    });

    return list;
  };

  const allUserTaskEntries = getUserTasksList();

  // Count of today's daily tasks for the "All" tab badge
  const dailyTaskEntries = allUserTaskEntries.filter(({ task, dateKey }) => {
    const subs = task.subtasks || [];
    const isCompleted = subs.length > 0 && subs.every((s) => s.done);
    const isTodayTask =
      dateKey === todayDateKey ||
      task.dueDateIso === todayDateKey ||
      Boolean(task.repeatDaily);
    // If it's from another date and already completed, it belongs in Completed category
    if (!isTodayTask && isCompleted) return false;
    return isTodayTask;
  });

  // Filtering logic:
  // - "All": Only shows daily tasks (today's tasks & daily repeating tasks). Other dates' completed tasks are shown in "Completed".
  // - "Due Soon": Shows incomplete tasks (upcoming / due soon or locked after 12h).
  // - "Completed": Shows all completed tasks across all dates.
  const filteredTaskEntries = allUserTaskEntries.filter(({ task, dateKey }) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchSub = task.subtasks.some((s) =>
        s.title.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchSub) return false;
    }

    const totalSub = task.subtasks.length;
    const doneSub = task.subtasks.filter((s) => s.done).length;
    const isCompleted = totalSub > 0 && doneSub === totalSub;
    const isTodayTask =
      dateKey === todayDateKey ||
      task.dueDateIso === todayDateKey ||
      Boolean(task.repeatDaily);

    if (taskFilter === 'all') {
      if (dateKey !== todayDateKey && task.dueDateIso !== todayDateKey && isCompleted) {
        return false;
      }
      return isTodayTask;
    }
    if (taskFilter === 'due-soon') {
      return !isCompleted;
    }
    if (taskFilter === 'completed') {
      return isCompleted;
    }
    return true;
  });

  const todayNewTasksCount = getTodayNewTasksCount(currentUser);

  const handleHireClick = (targetUser: UserProfileData) => {
    if (!currentUser) {
      setActiveScreen('login');
      return;
    }
    if (!targetUser.openForWork) {
      showToast(`${targetUser.name} is currently Not Available`);
      return;
    }
    setHireTargetUser(targetUser);
    if (!currentUser.isSubscribed) {
      setShowSubscriptionModal(true);
    } else {
      setShowContactEmailModal(true);
    }
  };

  const handleSubscribePurchase = async () => {
    if (!currentUser) {
      setShowSubscriptionModal(false);
      setActiveScreen('login');
      return;
    }
    await runWithLoadingLock('subscribe', async () => {
      const updated = await activateUserSubscription(currentUser.uid);
      if (updated) {
        setCurrentUser(updated);
        refreshFromDatabase();
        setShowSubscriptionModal(false);
        showToast(
          'Taskora Pro ($1.99/mo) activated! Direct email contact, unlimited tasks & ad-free mode unlocked.'
        );
        if (hireTargetUser) {
          setShowContactEmailModal(true);
        }
      }
    });
  };

  const openCreateNewTaskScreen = () => {
    if (currentUser && !currentUser.isSubscribed) {
      const countToday = getTodayNewTasksCount(currentUser);
      if (countToday >= FREE_DAILY_TASK_LIMIT) {
        setHireTargetUser(null);
        setShowSubscriptionModal(true);
        showToast(
          `Free account limit: ${FREE_DAILY_TASK_LIMIT} new tasks per day. Subscribe ($1.99/mo) for unlimited tasks!`
        );
        return;
      }
    }
    setEditingTaskRef(null);
    setNewTaskTitle('');
    setNewTaskDeadlineIso(todayDateKey);
    setNewTaskRepeatDaily(false);
    setDraftSubtasks([]);
    setSubtaskTitleInput('');
    setShowNewSubtaskCard(false);
    setActiveScreen('create-task');
  };

  const handleOpenEditTask = (
    monthKey: string,
    dateKey: string,
    task: TaskItem
  ) => {
    setEditingTaskRef({ monthKey, dateKey, taskId: task.id });
    setNewTaskTitle(task.title);
    setNewTaskDeadlineIso(task.dueDateIso || dateKey);
    setNewTaskRepeatDaily(Boolean(task.repeatDaily));
    setDraftSubtasks(
      (task.subtasks || []).map((st) => ({
        id: st.id,
        title: st.title,
        done: st.done,
      }))
    );
    setSubtaskTitleInput('');
    setShowNewSubtaskCard(false);
    setActiveScreen('create-task');
  };

  const handleAddDraftSubtask = () => {
    if (busyLockRef.current) return;
    if (!subtaskTitleInput.trim()) {
      showToast('Please enter a subtask title');
      return;
    }
    setDraftSubtasks((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}`,
        title: subtaskTitleInput.trim(),
        done: false,
      },
    ]);
    setSubtaskTitleInput('');
    setShowNewSubtaskCard(false);
  };

  const handleUpdateDraftSubtaskTitle = (id: string, nextTitle: string) => {
    setDraftSubtasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: nextTitle } : item))
    );
  };

  const handleRemoveDraftSubtask = (id: string) => {
    if (busyLockRef.current) return;
    setDraftSubtasks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCreateTaskSubmit = async () => {
    if (!currentUser) {
      setActiveScreen('login');
      return;
    }
    if (!newTaskTitle.trim()) {
      showToast('Please enter a task title');
      return;
    }
    await runWithLoadingLock('save-task', async () => {
      const cleanedDraftSubtasks = draftSubtasks
        .map((s) => ({ ...s, title: s.title.trim() }))
        .filter((s) => s.title.length > 0);

      const finalSubtasks =
        cleanedDraftSubtasks.length > 0
          ? cleanedDraftSubtasks
          : subTitleFallback(subtaskTitleInput, newTaskTitle);

      if (editingTaskRef) {
        await updateUserTask(
          currentUser.uid,
          editingTaskRef.monthKey,
          editingTaskRef.dateKey,
          editingTaskRef.taskId,
          {
            title: newTaskTitle.trim(),
            dueDateIso: newTaskDeadlineIso,
            repeatDaily: newTaskRepeatDaily,
            subtasks: finalSubtasks,
          }
        );
        setEditingTaskRef(null);
        setNewTaskTitle('');
        setNewTaskRepeatDaily(false);
        setDraftSubtasks([]);
        setSubtaskTitleInput('');
        setShowNewSubtaskCard(false);
        refreshFromDatabase();
        showToast('Task updated!');
        setActiveScreen('tasks');
        return;
      }

      if (
        !currentUser.isSubscribed &&
        getTodayNewTasksCount(currentUser) >= FREE_DAILY_TASK_LIMIT
      ) {
        setHireTargetUser(null);
        setShowSubscriptionModal(true);
        showToast(
          `Free account limit reached (${FREE_DAILY_TASK_LIMIT} new tasks/day). Subscribe for $1.99/mo for unlimited tasks!`
        );
        return;
      }

      try {
        await addTaskUnderMonthAndDate(
          currentUser.uid,
          newTaskTitle.trim(),
          newTaskDeadlineIso,
          finalSubtasks,
          newTaskRepeatDaily
        );
      } catch (err: any) {
        if (err?.message === 'FREE_LIMIT_REACHED') {
          setHireTargetUser(null);
          setShowSubscriptionModal(true);
          showToast(
            `Free account limit reached (${FREE_DAILY_TASK_LIMIT} new tasks/day). Subscribe for $1.99/mo for unlimited tasks!`
          );
          return;
        }
        throw err;
      }

      setNewTaskTitle('');
      setNewTaskRepeatDaily(false);
      setDraftSubtasks([]);
      setSubtaskTitleInput('');
      setShowNewSubtaskCard(false);
      refreshFromDatabase();
      showToast('Task saved!');
      setActiveScreen('tasks');
    });
  };

  function subTitleFallback(pendingSub: string, taskTitle: string) {
    if (pendingSub.trim()) {
      return [
        {
          id: `sub_${Date.now()}`,
          title: pendingSub.trim(),
        },
      ];
    }
    return [
      {
        id: `sub_${Date.now()}`,
        title: `Complete: ${taskTitle.trim()}`,
      },
    ];
  }

  const handleDeleteTaskCard = async (
    monthKey: string,
    dateKey: string,
    taskId: string
  ) => {
    if (!currentUser) return;
    await runWithLoadingLock(`delete-${taskId}`, async () => {
      await deleteUserTask(currentUser.uid, monthKey, dateKey, taskId);
      refreshFromDatabase();
      showToast('Task deleted');
    });
  };

  const handleSignInSubmit = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      showToast('Please enter your email and password');
      return;
    }
    await runWithLoadingLock('signin', async () => {
      try {
        const user = await signInUserAccount(loginEmail, loginPassword);
        setCurrentUser(user);
        refreshFromDatabase();
        showToast(`Welcome back, ${user.name}!`);
        setActiveScreen('tasks');
      } catch (err: any) {
        showToast(err?.message || 'Sign in failed');
      }
    });
  };

  const handleSendResetLinkSubmit = async () => {
    if (!resetEmailInput.trim()) {
      showToast('Please enter your registered email address');
      return;
    }
    await runWithLoadingLock('forgot', async () => {
      setForgotLoading(true);
      try {
        const sentToEmail = await sendFirebasePasswordResetLink(resetEmailInput);
        setResetEmailInput(sentToEmail);
        setLoginEmail(sentToEmail);
        setForgotLinkSent(true);
        showToast(`Password reset link sent to ${sentToEmail}`);
      } catch (err: any) {
        showToast(err?.message || 'Could not send reset link');
      } finally {
        setForgotLoading(false);
      }
    });
  };

  const handleSignUpSubmit = async () => {
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      showToast('Please fill in your name, email, and password');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      showToast('Passwords do not match');
      return;
    }
    await runWithLoadingLock('signup', async () => {
      try {
        const user = await registerUserAccount({
          name: signupName,
          email: signupEmail,
          role: signupRole || 'Professional',
          country: signupCountry,
          state: signupState,
          password: signupPassword,
        });
        setCurrentUser(user);
        refreshFromDatabase();
        showToast(`Account created! Welcome to Taskora, ${user.name}.`);
        setActiveScreen('tasks');
      } catch (err: any) {
        showToast(err?.message || 'Registration failed');
      }
    });
  };

  const handleLogout = async () => {
    await runWithLoadingLock('logout', async () => {
      await signOutUserAccount();
      setCurrentUser(null);
      refreshFromDatabase();
      showToast('Signed out');
      setActiveScreen('guest-leaderboard');
    });
  };

  const passwordStrength =
    signupPassword.length === 0
      ? 0
      : signupPassword.length < 6
      ? 1
      : signupPassword.length < 10
      ? 2
      : 3;

  // Format selectedMonthKey ("2026-11") -> "Nov 2026"
  const formatMonthKeyDisplay = (mKey: string) => {
    const [yStr, mStr] = mKey.split('-');
    const mIdx = Number(mStr) - 1;
    return `${MONTH_NAMES_SHORT[mIdx] || 'Nov'} ${yStr}`;
  };
  const selectedMonthDisplay = formatMonthKeyDisplay(selectedMonthKey);

  // Dynamic Leaderboard Filtering
  const availableLocations = Array.from(
    new Set(rankedUsers.map((u) => u.location).filter(Boolean))
  );
  const activeLocationFilter =
    selectedLocationFilter !== 'ALL'
      ? selectedLocationFilter
      : currentUser?.location || availableLocations[0] || '';

  const displayedLeaderboardUsers =
    locationScope === 'global' || !activeLocationFilter
      ? rankedUsers
      : rankedUsers.filter(
          (u) => u.location.toLowerCase() === activeLocationFilter.toLowerCase()
        );

  const top1User = displayedLeaderboardUsers[0] || null;
  const top2User = displayedLeaderboardUsers[1] || null;
  const top3User = displayedLeaderboardUsers[2] || null;
  const remainingRankedUsers = displayedLeaderboardUsers.slice(3);

  // Dynamic Daily Momentum calculations for logged-in user (based on today's daily tasks)
  const totalDailyCount = dailyTaskEntries.length;
  const completedDailyCount = dailyTaskEntries.filter(({ task }) => {
    const subs = task.subtasks || [];
    return subs.length > 0 && subs.every((s) => s.done);
  }).length;
  const flowPercentage =
    totalDailyCount > 0 ? Math.round((completedDailyCount / totalDailyCount) * 100) : 0;
  const remainingDailyCount = Math.max(0, totalDailyCount - completedDailyCount);
  const currentMonthCompletedDays =
    currentUser?.completedDatesInMonth?.[currentMonthKey] || [];

  // Calendar grid helper for Popup Calendar Modal
  const getCalendarDaysInMonth = (year: number, monthIdx: number) => {
    const firstDayOfWeek = new Date(year, monthIdx, 1).getDay(); // 0(Sun)..6(Sat)
    const leadingEmpty = (firstDayOfWeek + 6) % 7; // Mon=0..Sun=6
    const daysCount = new Date(year, monthIdx + 1, 0).getDate();
    return { leadingEmpty, daysCount };
  };

  // =========================================================================
  // 0. ENTRY WHITE PAGE WITH TaskoraLogo.png (Clean, no subtitle)
  // =========================================================================
  if (activeScreen === 'entry') {
    return (
      <div
        onClick={() => {
          const user = getCurrentSessionUser();
          setActiveScreen(user ? 'tasks' : 'guest-leaderboard');
        }}
        className="min-h-screen w-full bg-black flex flex-col items-center justify-start cursor-pointer select-none"
      >
        <div className="w-full max-w-[430px] min-h-screen bg-white flex flex-col">
          {/* Black mobile status bar background for phone status icons */}
          <div className="w-full h-[28px] bg-black shrink-0" />
          <div className="flex-1 bg-white flex flex-col items-center justify-center px-8">
            <img
              alt="Taskora"
              src="/assets/TaskoraLogo.png"
              className="w-[220px] max-w-[75%] h-auto object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  // Shared Leaderboard Body (used in both Guest View and Logged-in Leaderboard View)
  const renderDynamicLeaderboardSection = (isGuestView: boolean) => (
    <div className="flex flex-col w-full">
      {/* Header & Interactive Month Calendar Picker Button */}
      <div className="flex items-center justify-between pt-[4px] w-full">
        <span className="font-['Manrope:SemiBold'] text-[#181445] text-[24px] leading-[32px] tracking-[-0.6px]">
          Monthly Leaderboard
        </span>
        <button
          type="button"
          onClick={() => {
            const [yStr] = selectedMonthKey.split('-');
            setPickerYear(Number(yStr) || currentYear);
            setShowMonthPickerModal(true);
          }}
          className="bg-[#efebff] border border-[rgba(204,195,215,0.3)] flex gap-[6px] items-center px-[13px] py-[7px] rounded-[6px] cursor-pointer hover:bg-[#e1d8ff]"
        >
          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[13px] leading-[18px]">
            {selectedMonthDisplay}
          </span>
          <img alt="" className="h-[5.55px] w-[9px]" src="/assets/f0a47.svg" />
        </button>
      </div>

      {/* Location Filter Controls */}
      <div className="flex flex-col gap-[8px] pt-[10px] w-full">
        <div className="flex gap-[6px] items-center">
          <img alt="" className="h-[13.333px] w-[9.333px]" src="/assets/ac60b.svg" />
          <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[12px] leading-[18px]">
            {locationScope === 'global' || !activeLocationFilter
              ? `Showing performers Worldwide for ${selectedMonthDisplay} (${displayedLeaderboardUsers.length})`
              : `Showing performers in ${activeLocationFilter} for ${selectedMonthDisplay} (${displayedLeaderboardUsers.length})`}
          </span>
        </div>

        <div className="flex gap-[8px] items-center w-full">
          <div className="bg-[#ebddff] border border-[rgba(83,0,183,0.2)] flex-1 p-px relative rounded-[6px]">
            <img
              alt=""
              className="absolute left-[12px] top-1/2 -translate-y-1/2 h-[14.167px] w-[11.333px] pointer-events-none"
              src="/assets/0b5ae.svg"
            />
            <select
              value={locationScope === 'global' ? 'GLOBAL' : activeLocationFilter}
              onChange={(e) => {
                if (e.target.value === 'GLOBAL') {
                  setLocationScope('global');
                } else {
                  setLocationScope('local');
                  setSelectedLocationFilter(e.target.value);
                }
              }}
              className="appearance-none w-full bg-transparent border border-[#6b7280] rounded-[6px] pl-[33px] pr-[28px] py-[9px] font-['Hanken_Grotesk:Bold'] text-[#250059] text-[13px] leading-[18px] outline-none cursor-pointer"
            >
              {availableLocations.length === 0 ? (
                <option value="GLOBAL">All Locations (Empty Month)</option>
              ) : (
                <>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                  <option value="GLOBAL">All Locations (Global)</option>
                </>
              )}
            </select>
            <img
              alt=""
              className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[5.55px] w-[9px] pointer-events-none"
              src="/assets/ffd7c.svg"
            />
          </div>

          <button
            onClick={() =>
              setLocationScope((prev) => (prev === 'global' ? 'local' : 'global'))
            }
            className={`${
              locationScope === 'global'
                ? 'bg-[#5300b7] text-white'
                : 'bg-[#efebff] text-[#4a4455]'
            } border border-[rgba(204,195,215,0.3)] flex gap-[6px] items-center px-[17px] py-[9px] rounded-[6px] shrink-0 cursor-pointer`}
          >
            <img alt="" className="size-[13.333px]" src="/assets/47366.svg" />
            <span className="font-['Hanken_Grotesk:SemiBold'] text-[13px] leading-[18px]">
              Global
            </span>
          </button>
        </div>
      </div>

      {/* Logged-In User Sticky Status Card */}
      {!isGuestView && currentUser && (
        <div className="pt-[16px] w-full">
          <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col gap-[8px] items-start overflow-clip p-[17px] relative rounded-[6px] shadow-2xs w-full">
            <div className="absolute bg-[rgba(235,221,255,0.2)] blur-[40px] right-[-40px] rounded-full size-[128px] top-[-40px]" />
            <div className="flex gap-[10px] items-center w-full">
              <div className="relative rounded-full shadow-2xs shrink-0 size-[48px] overflow-hidden">
                <img
                  alt={currentUser.name}
                  className="size-full object-cover"
                  src={currentUser.profilePicture || DEFAULT_DEMO_AVATAR}
                />
              </div>
              <div className="flex flex-col items-start">
                <div className="flex flex-wrap gap-[6px] items-center">
                  <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px] leading-[24px]">
                    {currentUser.name}
                  </span>
                  <span className="bg-[#ebddff] text-[#250059] font-['Hanken_Grotesk:SemiBold'] text-[11px] px-[8px] py-[2px] rounded-[4px]">
                    YOU
                  </span>
                  <span
                    className={`text-[10px] font-['Hanken_Grotesk:SemiBold'] px-[7px] py-[2px] rounded-[4px] ${
                      currentUser.openForWork
                        ? 'bg-[rgba(108,248,187,0.4)] text-[#00714d]'
                        : 'bg-[#efebff] text-[#4a4455]'
                    }`}
                  >
                    {currentUser.openForWork ? 'Open For Work' : 'Not Available'}
                  </span>
                </div>
                <div className="flex gap-[4px] items-center flex-wrap">
                  <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                    {currentUser.role}
                  </span>
                  <span className="text-[#4a4455] text-[12px]">•</span>
                  <div className="flex gap-[2px] items-center">
                    <img alt="" className="h-[10.8px] w-[8.6px]" src="/assets/a4149.svg" />
                    <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[12px]">
                      {currentUser.location}
                    </span>
                  </div>
                </div>
                <span className="font-['Hanken_Grotesk:Medium'] text-[#006c49] text-[11px] leading-[20px]">
                  Rank #{currentUser.rankNumber} Overall
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-[8px] w-full">
              <div className="flex gap-[6px] items-center">
                <img alt="" className="size-[13.333px]" src="/assets/d278b.svg" />
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[12px]">
                  {currentUser.tasksCompleted}
                </span>
                <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                  Tasks
                </span>
              </div>
              <div className="bg-[#ccc3d7] rounded-full size-[4px]" />
              <div className="flex gap-[6px] items-center">
                <img alt="" className="h-[14px] w-[12px]" src="/assets/396ed.svg" />
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[12px]">
                  {currentUser.completionRate}%
                </span>
                <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                  Completion
                </span>
              </div>
              <div className="bg-[#ccc3d7] rounded-full size-[4px]" />
              <div className="flex gap-[6px] items-center">
                <img alt="" className="h-[12.667px] w-[10.667px]" src="/assets/83a12.svg" />
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[12px]">
                  {currentUser.streakDays}d
                </span>
                <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                  Streak
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty Leaderboard State if selected month has no data */}
      {displayedLeaderboardUsers.length === 0 ? (
        <div className="mt-6 bg-white border border-[rgba(204,195,215,0.35)] rounded-[8px] p-7 flex flex-col items-center text-center gap-3 shadow-2xs">
          <div className="size-[52px] rounded-full bg-[#efebff] flex items-center justify-center">
            <img alt="" className="size-[22px]" src="/assets/ff568.svg" />
          </div>
          <h3 className="font-['Manrope:SemiBold'] text-[#181445] text-[17px]">
            Empty Leaderboard ({selectedMonthDisplay})
          </h3>
          <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[13px] max-w-[270px]">
            No task or ranking data found for {selectedMonthDisplay}. Select another month or complete tasks to appear on the leaderboard.
          </p>
          {!currentUser && (
            <button
              onClick={() => setActiveScreen('signup')}
              className="mt-1 bg-[#6d28d9] text-white font-['Hanken_Grotesk:SemiBold'] text-[13px] px-5 py-2.5 rounded-[6px] cursor-pointer hover:bg-[#5b21b6]"
            >
              Create Account &amp; Claim Rank #1
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Top Performers Podium Showcase */}
          <div className="flex flex-col pt-[20px] w-full">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-baseline gap-2">
                <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px] leading-[24px]">
                  Top Performers
                </span>
                <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                  • {locationScope === 'global' ? 'Global Rank' : 'Area Rank'}
                </span>
              </div>
              <div className="flex gap-[2px] items-center">
                <img alt="" className="size-[12.833px]" src="/assets/c0196.svg" />
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px]">
                  Live Pace
                </span>
              </div>
            </div>

            <div className="flex gap-[8px] items-end justify-center pb-[4px] pt-[36px] w-full">
              {/* Rank #2 Slot */}
              <div className="flex flex-1 flex-col items-center min-w-0">
                {top2User ? (
                  <>
                    <div className="flex flex-col items-center pb-[8px]">
                      <div className="pb-[4px]">
                        <div className="bg-[#e9e5ff] border border-[rgba(204,195,215,0.3)] flex gap-[2px] items-center px-[9px] py-[3px] rounded-[4px]">
                          <img alt="" className="h-[11.667px] w-[5.833px]" src="/assets/231d3.svg" />
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[11px]">
                            2nd
                          </span>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="relative rounded-full shadow-md size-[56px] overflow-hidden">
                          <img
                            alt={top2User.name}
                            className="size-full object-cover"
                            src={top2User.profilePicture || DEFAULT_DEMO_AVATAR}
                          />
                        </div>
                        <div className="absolute bg-[#e3dfff] bottom-[-6px] right-[-4px] rounded-full size-[24px] flex items-center justify-center shadow-xs">
                          <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[11px]">
                            2
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col h-[182px] items-center justify-between p-[9px] rounded-[6px] w-full">
                      <div className="flex flex-col items-center w-full">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] truncate max-w-full">
                          {top2User.name}
                        </span>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] truncate max-w-full">
                          {top2User.role}
                        </span>
                        <div className="mt-[2px] bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] flex gap-[2px] items-center px-[7px] py-px rounded-[4px] max-w-full overflow-hidden">
                          <img alt="" className="h-[8.333px] w-[6.667px] shrink-0" src="/assets/a4e51.svg" />
                          <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[10px] truncate">
                            {top2User.location}
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] rounded-[4px] w-full py-[5px] flex flex-col items-center">
                        <span className="font-['Manrope:SemiBold'] text-[#181445] text-[15px]">
                          {top2User.tasksCompleted} tasks
                        </span>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[10px]">
                          {top2User.completionRate}% rate
                        </span>
                      </div>
                      {!isGuestView && currentUser ? (
                        <button
                          onClick={() => handleHireClick(top2User)}
                          className={`${
                            top2User.openForWork ? 'bg-[#6d28d9]' : 'bg-[#7b7486]'
                          } rounded-[6px] w-full py-[4px] flex gap-[4px] items-center justify-center cursor-pointer`}
                        >
                          <img alt="" className="h-[11.875px] w-[12.5px]" src="/assets/ab395.svg" />
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-white text-[11px]">
                            {top2User.openForWork ? 'Hire' : 'Busy'}
                          </span>
                        </button>
                      ) : (
                        <div
                          className={`rounded-[4px] w-full py-[4px] text-center font-['Hanken_Grotesk:SemiBold'] text-[10px] ${
                            top2User.openForWork
                              ? 'bg-[rgba(108,248,187,0.35)] text-[#00714d]'
                              : 'bg-[#efebff] text-[#7b7486]'
                          }`}
                        >
                          {top2User.openForWork ? 'Open For Work' : 'Not Available'}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-white/50 border border-dashed border-[rgba(204,195,215,0.5)] flex flex-col h-[176px] items-center justify-center p-[9px] rounded-[6px] w-full text-center">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#7b7486] text-[12px]">
                      Rank #2 Open
                    </span>
                  </div>
                )}
              </div>

              {/* Rank #1 Slot */}
              <div className="flex-1 h-[282px] min-w-0 relative">
                {top1User && (
                  <div className="absolute flex flex-col items-center left-0 right-0 top-[-24px]">
                    <div className="flex flex-col items-center pb-[8px]">
                      <div className="pb-[4px]">
                        <div className="bg-[#fef3c7] border border-[rgba(252,211,77,0.4)] flex gap-[4px] items-center px-[11px] py-[3px] rounded-[4px]">
                          <img alt="" className="h-[11.25px] w-[12.5px]" src="/assets/4f72c.svg" />
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#78350f] text-[11px]">
                            Master
                          </span>
                        </div>
                      </div>
                      <div className="relative">
                        <div
                          className="absolute blur-[3px] inset-[-4px] opacity-70 rounded-full"
                          style={{
                            backgroundImage:
                              'linear-gradient(45deg, rgb(252, 211, 77) 0%, rgb(235, 221, 255) 50%, rgb(108, 248, 187) 100%)',
                          }}
                        />
                        <div className="relative rounded-full shadow-lg size-[64px] overflow-hidden">
                          <img
                            alt={top1User.name}
                            className="size-full object-cover"
                            src={top1User.profilePicture || DEFAULT_DEMO_AVATAR}
                          />
                        </div>
                        <div className="absolute bg-[#fbbf24] bottom-[-6px] right-[-4px] rounded-full size-[24px] flex items-center justify-center shadow-xs">
                          <span className="font-['Hanken_Grotesk:Bold'] text-[#451a03] text-[11px]">
                            1
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-[rgba(83,0,183,0.2)] flex flex-col h-[208px] items-center justify-between overflow-clip p-[11px] relative rounded-[6px] shadow-md w-full">
                      <div className="absolute bg-gradient-to-r from-[#fcd34d] via-[#6d28d9] to-[#6cf8bb] h-[4px] left-0 right-0 top-0" />
                      <div className="flex flex-col items-center pt-[4px] w-full">
                        <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[13px] truncate max-w-full">
                          {top1User.name}
                        </span>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px] truncate max-w-full">
                          {top1User.role}
                        </span>
                        <div className="mt-[2px] bg-[rgba(235,221,255,0.4)] border border-[rgba(83,0,183,0.2)] flex gap-[2px] items-center px-[7px] py-px rounded-[4px] max-w-full overflow-hidden">
                          <img alt="" className="h-[8.333px] w-[6.667px] shrink-0" src="/assets/c2e72.svg" />
                          <span className="font-['Hanken_Grotesk:Bold'] text-[#5300b7] text-[10px] truncate">
                            {top1User.location}
                          </span>
                        </div>
                      </div>
                      <div className="bg-[rgba(235,221,255,0.3)] border border-[rgba(83,0,183,0.2)] rounded-[4px] w-full py-[7px] flex flex-col items-center text-[#5300b7]">
                        <span className="font-['Manrope:Bold'] text-[15px]">
                          {top1User.tasksCompleted} tasks
                        </span>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[11px]">
                          {top1User.completionRate}% rate
                        </span>
                      </div>
                      {!isGuestView && currentUser ? (
                        <button
                          onClick={() => handleHireClick(top1User)}
                          className={`${
                            top1User.openForWork ? 'bg-[#5300b7]' : 'bg-[#7b7486]'
                          } rounded-[6px] w-full py-[6px] flex gap-[4px] items-center justify-center cursor-pointer`}
                        >
                          <img alt="" className="h-[11.875px] w-[12.5px]" src="/assets/ab395.svg" />
                          <span className="font-['Hanken_Grotesk:Bold'] text-white text-[11px]">
                            {top1User.openForWork ? 'Hire' : 'Busy'}
                          </span>
                        </button>
                      ) : (
                        <div
                          className={`rounded-[4px] w-full py-[5px] text-center font-['Hanken_Grotesk:Bold'] text-[10px] ${
                            top1User.openForWork
                              ? 'bg-[rgba(108,248,187,0.35)] text-[#00714d]'
                              : 'bg-[#efebff] text-[#7b7486]'
                          }`}
                        >
                          {top1User.openForWork ? 'Open For Work' : 'Not Available'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Rank #3 Slot */}
              <div className="flex flex-1 flex-col items-center min-w-0">
                {top3User ? (
                  <>
                    <div className="flex flex-col items-center pb-[8px]">
                      <div className="pb-[4px]">
                        <div className="bg-[#ffedd5] border border-[#fed7aa] flex gap-[2px] items-center px-[9px] py-[3px] rounded-[4px]">
                          <img alt="" className="h-[12.25px] w-[9.333px]" src="/assets/6f9e6.svg" />
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#7c2d12] text-[11px]">
                            3rd
                          </span>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="relative rounded-full shadow-md size-[56px] overflow-hidden">
                          <img
                            alt={top3User.name}
                            className="size-full object-cover"
                            src={top3User.profilePicture || DEFAULT_DEMO_AVATAR}
                          />
                        </div>
                        <div className="absolute bg-[#fed7aa] bottom-[-6px] right-[-4px] rounded-full size-[24px] flex items-center justify-center shadow-xs">
                          <span className="font-['Hanken_Grotesk:Bold'] text-[#431407] text-[11px]">
                            3
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col h-[182px] items-center justify-between p-[9px] rounded-[6px] w-full">
                      <div className="flex flex-col items-center w-full">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] truncate max-w-full">
                          {top3User.name}
                        </span>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] truncate max-w-full">
                          {top3User.role}
                        </span>
                        <div className="mt-[2px] bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] flex gap-[2px] items-center px-[7px] py-px rounded-[4px] max-w-full overflow-hidden">
                          <img alt="" className="h-[8.333px] w-[6.667px] shrink-0" src="/assets/a4e51.svg" />
                          <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[10px] truncate">
                            {top3User.location}
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] rounded-[4px] w-full py-[5px] flex flex-col items-center">
                        <span className="font-['Manrope:SemiBold'] text-[#181445] text-[15px]">
                          {top3User.tasksCompleted} tasks
                        </span>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[10px]">
                          {top3User.completionRate}% rate
                        </span>
                      </div>
                      {!isGuestView && currentUser ? (
                        <button
                          onClick={() => handleHireClick(top3User)}
                          className={`${
                            top3User.openForWork ? 'bg-[#6d28d9]' : 'bg-[#7b7486]'
                          } rounded-[6px] w-full py-[4px] flex gap-[4px] items-center justify-center cursor-pointer`}
                        >
                          <img alt="" className="h-[11.875px] w-[12.5px]" src="/assets/ab395.svg" />
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-white text-[11px]">
                            {top3User.openForWork ? 'Hire' : 'Busy'}
                          </span>
                        </button>
                      ) : (
                        <div
                          className={`rounded-[4px] w-full py-[4px] text-center font-['Hanken_Grotesk:SemiBold'] text-[10px] ${
                            top3User.openForWork
                              ? 'bg-[rgba(108,248,187,0.35)] text-[#00714d]'
                              : 'bg-[#efebff] text-[#7b7486]'
                          }`}
                        >
                          {top3User.openForWork ? 'Open For Work' : 'Not Available'}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-white/50 border border-dashed border-[rgba(204,195,215,0.5)] flex flex-col h-[176px] items-center justify-center p-[9px] rounded-[6px] w-full text-center">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#7b7486] text-[12px]">
                      Rank #3 Open
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rankings List (All Registered Performers) */}
          <div className="flex flex-col pt-[20px] w-full">
            <div className="flex items-center justify-between px-[4px] w-full">
              <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px]">
                {remainingRankedUsers.length > 0 ? 'Rankings 4+' : 'All Ranked Performers'}
              </span>
              <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                {displayedLeaderboardUsers.length}{' '}
                {displayedLeaderboardUsers.length === 1 ? 'candidate' : 'candidates'}
              </span>
            </div>

            <div className="flex flex-col gap-[10px] pt-[10px] w-full">
              {(remainingRankedUsers.length > 0
                ? remainingRankedUsers
                : displayedLeaderboardUsers
              ).map((u) => {
                const isMe = currentUser?.uid === u.uid;
                return (
                  <div
                    key={u.uid}
                    className={`${
                      isMe
                        ? 'bg-[rgba(233,229,255,0.6)] border-[rgba(83,0,183,0.2)]'
                        : 'bg-white border-[rgba(204,195,215,0.3)]'
                    } border flex flex-col gap-[8px] p-[13px] relative rounded-[6px] shadow-2xs overflow-hidden w-full`}
                  >
                    {isMe && (
                      <div className="absolute bg-[#6d28d9] bottom-0 left-0 top-0 w-[6px]" />
                    )}
                    <div className="flex items-center justify-between pl-[4px]">
                      <div className="flex gap-[10px] items-center">
                        <span className="font-['Manrope:Bold'] text-[#5300b7] text-[18px] w-[20px] text-center">
                          {u.rankNumber}
                        </span>
                        <div className="rounded-full size-[40px] overflow-hidden shrink-0">
                          <img
                            alt={u.name}
                            className="size-full object-cover"
                            src={u.profilePicture || DEFAULT_DEMO_AVATAR}
                          />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-[6px]">
                            <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[13px]">
                              {u.name}
                            </span>
                            {isMe && (
                              <span className="bg-[#ebddff] text-[#250059] font-['Hanken_Grotesk:SemiBold'] text-[10px] px-[6px] rounded-[4px]">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                            {u.role}
                          </span>
                          <div className="flex items-center gap-[2px]">
                            <img alt="" className="h-[10.8px] w-[8.6px]" src="/assets/a4149.svg" />
                            <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[12px]">
                              {u.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!isGuestView && currentUser && !isMe && u.openForWork && (
                        <button
                          onClick={() => handleHireClick(u)}
                          className="bg-[#6d28d9] flex gap-[4px] items-center px-[12px] py-[6px] rounded-[6px] cursor-pointer hover:bg-[#5b21b6]"
                        >
                          <img alt="" className="h-[11.875px] w-[12.5px]" src="/assets/ce3f0.svg" />
                          <span className="font-['Hanken_Grotesk:Medium'] text-[11px] text-white">
                            Hire
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="border-t border-[rgba(204,195,215,0.3)] pt-[5px] pl-[24px] flex items-center justify-between text-[11px]">
                      <div className="flex gap-[8px] items-center">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7]">
                          {u.tasksCompleted} tasks completed
                        </span>
                        <span className="text-[#4a4455]">•</span>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#006c49]">
                          {u.completionRate}% completion
                        </span>
                      </div>
                      <span
                        className={`font-['Hanken_Grotesk:SemiBold'] ${
                          u.openForWork ? 'text-[#006c49]' : 'text-[#7b7486]'
                        }`}
                      >
                        {u.openForWork ? 'Open For Work' : 'Not Available'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-start">
      {/* Global Loading Spinner Pill (Appears whenever any button action is processing) */}
      {busyAction && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] bg-[#5300b7] text-white px-3.5 py-1.5 rounded-full text-[11px] font-['Hanken_Grotesk:SemiBold'] shadow-lg flex items-center gap-2 pointer-events-none">
          {renderSpinner('size-[12px]', 'border-white')}
          <span>Processing...</span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-[#181445] text-white px-4 py-2 rounded-full text-[12px] font-['Hanken_Grotesk:SemiBold'] shadow-lg flex items-center gap-2 max-w-[90vw] text-center">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          POPUP SUBSCRIPTION MODAL ($1.99 / Month — Hire Profiles, No Ads, Unlimited Tasks)
         ===================================================================== */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] p-5 w-full max-w-[370px] shadow-2xl border border-[rgba(109,40,217,0.3)] flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[5px] bg-gradient-to-r from-[#6d28d9] via-[#5300b7] to-[#006c49]" />

            <div className="flex items-start justify-between pt-1">
              <div className="flex flex-col gap-1">
                <span className="bg-[#ebddff] text-[#5300b7] text-[10px] font-['Hanken_Grotesk:Bold'] px-2.5 py-0.5 rounded-[4px] w-fit uppercase tracking-wider">
                  TASKORA PRO • SUBSCRIPTION
                </span>
                <h3 className="font-['Manrope:Bold'] text-[19px] text-[#181445] leading-[25px]">
                  {hireTargetUser
                    ? `Subscribe to Contact ${hireTargetUser.name}`
                    : 'Upgrade to Taskora Pro'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(false)}
                className="text-[#7b7486] text-[14px] font-['Hanken_Grotesk:Bold'] cursor-pointer px-1"
              >
                ✕
              </button>
            </div>

            {hireTargetUser && (
              <div className="bg-[#f6f2ff] border border-[rgba(109,40,217,0.2)] rounded-[8px] p-3 flex items-center gap-3">
                <img
                  alt={hireTargetUser.name}
                  src={hireTargetUser.profilePicture || DEFAULT_DEMO_AVATAR}
                  className="size-[42px] rounded-full object-cover shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[13px] truncate">
                    {hireTargetUser.name}
                  </span>
                  <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[11px] truncate">
                    {hireTargetUser.role} • {hireTargetUser.location}
                  </span>
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#006c49] text-[11px]">
                    Subscription required to contact via email
                  </span>
                </div>
              </div>
            )}

            {/* Price Card: $1.99 / month */}
            <div className="bg-gradient-to-br from-[#f6f2ff] to-[#efebff] border border-[rgba(83,0,183,0.25)] rounded-[8px] p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-['Hanken_Grotesk:Bold'] text-[#5300b7] text-[12px] uppercase">
                  Monthly Pro Plan
                </span>
                <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[11px]">
                  Full access • Cancel anytime
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-['Manrope:ExtraBold'] text-[#181445] text-[26px]">
                  {SUBSCRIPTION_PRICE_MONTHLY}
                </span>
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[12px]">
                  / month
                </span>
              </div>
            </div>

            {/* Subscription Benefits */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className="size-[22px] rounded-full bg-[rgba(108,248,187,0.4)] text-[#006c49] flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">
                  ✓
                </div>
                <div className="flex flex-col">
                  <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[13px]">
                    Contact Every Profile by Email
                  </span>
                  <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                    Unlock all Hire buttons and directly email any top performer.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="size-[22px] rounded-full bg-[rgba(108,248,187,0.4)] text-[#006c49] flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">
                  ✓
                </div>
                <div className="flex flex-col">
                  <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[13px]">
                    Unlimited Daily Tasks
                  </span>
                  <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                    Remove the free account limit of {FREE_DAILY_TASK_LIMIT} new tasks per day.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="size-[22px] rounded-full bg-[rgba(108,248,187,0.4)] text-[#006c49] flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">
                  ✓
                </div>
                <div className="flex flex-col">
                  <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[13px]">
                    100% Ad-Free Experience
                  </span>
                  <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                    No advertisements anywhere in the app.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={handleSubscribePurchase}
                className="w-full py-3 rounded-[8px] bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-['Manrope:Bold'] text-[14px] shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-65 disabled:cursor-not-allowed"
              >
                {busyAction === 'subscribe' ? (
                  <>
                    {renderSpinner('size-[15px]', 'border-white')}
                    <span>Activating Pro...</span>
                  </>
                ) : (
                  <span>Subscribe Now — {SUBSCRIPTION_PRICE_MONTHLY} / Month</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full py-2 rounded-[6px] bg-[#efebff] text-[#4a4455] font-['Hanken_Grotesk:SemiBold'] text-[12px] cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DIRECT EMAIL CONTACT MODAL (For Subscribed Users Clicking "Hire")
         ===================================================================== */}
      {showContactEmailModal && hireTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] p-5 w-full max-w-[360px] shadow-2xl border border-[rgba(0,108,73,0.3)] flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-[#efebff] pb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-['Hanken_Grotesk:Bold'] text-[#006c49] uppercase tracking-wider">
                  TASKORA PRO • DIRECT HIRE CONTACT
                </span>
                <h3 className="font-['Manrope:Bold'] text-[18px] text-[#181445]">
                  Contact {hireTargetUser.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactEmailModal(false)}
                className="text-[#7b7486] text-[14px] font-['Hanken_Grotesk:Bold'] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 bg-[#f6f2ff] p-3 rounded-[8px]">
              <img
                alt={hireTargetUser.name}
                src={hireTargetUser.profilePicture || DEFAULT_DEMO_AVATAR}
                className="size-[48px] rounded-full object-cover shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[14px] truncate">
                  {hireTargetUser.name}
                </span>
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[12px] truncate">
                  {hireTargetUser.role}
                </span>
                <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[11px] truncate">
                  {hireTargetUser.location}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 bg-[#fcf8ff] border border-[rgba(204,195,215,0.5)] rounded-[6px] p-3">
              <span className="text-[10px] font-['Hanken_Grotesk:Bold'] text-[#4a4455] uppercase">
                Verified Email Address
              </span>
              <span className="font-['Manrope:Bold'] text-[#181445] text-[14px] break-all">
                {hireTargetUser.email}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${hireTargetUser.email}?subject=${encodeURIComponent(
                  `Hiring Inquiry via Taskora — ${hireTargetUser.name}`
                )}`}
                onClick={() => {
                  showToast(`Opening email client to contact ${hireTargetUser.name}...`);
                }}
                className="w-full py-2.5 rounded-[6px] bg-[#006c49] hover:bg-[#00563a] text-white font-['Hanken_Grotesk:Bold'] text-[13px] text-center cursor-pointer"
              >
                Send Email Now ({hireTargetUser.email})
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(hireTargetUser.email);
                  showToast(`Copied ${hireTargetUser.email} to clipboard!`);
                }}
                className="w-full py-2 rounded-[6px] bg-[#ebddff] text-[#250059] font-['Hanken_Grotesk:SemiBold'] text-[12px] cursor-pointer"
              >
                Copy Email Address
              </button>
              <button
                type="button"
                onClick={() => setShowContactEmailModal(false)}
                className="w-full py-2 rounded-[6px] bg-[#efebff] text-[#4a4455] font-['Hanken_Grotesk:SemiBold'] text-[12px] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          POPUP CALENDAR DATE PICKER (For Task Deadline & Subtask Deadline)
         ===================================================================== */}
      {calendarTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] p-5 w-full max-w-[348px] shadow-2xl border border-[rgba(204,195,215,0.45)] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#efebff] pb-2.5">
              <span className="font-['Manrope:SemiBold'] text-[16px] text-[#181445]">
                {calendarTarget === 'task'
                  ? 'Select Task Deadline'
                  : 'Select Subtask Deadline'}
              </span>
              <button
                type="button"
                onClick={() => setCalendarTarget(null)}
                className="text-[#7b7486] text-[13px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Month & Year Navigation Header */}
            <div className="flex items-center justify-between px-1 py-1">
              <button
                type="button"
                onClick={() => {
                  if (calViewMonth === 0) {
                    setCalViewMonth(11);
                    setCalViewYear((y) => y - 1);
                  } else {
                    setCalViewMonth((m) => m - 1);
                  }
                }}
                className="size-8 rounded-full bg-[#f6f2ff] text-[#5300b7] font-bold flex items-center justify-center cursor-pointer hover:bg-[#ebddff]"
              >
                ‹
              </button>
              <span className="font-['Manrope:Bold'] text-[15px] text-[#181445]">
                {MONTH_NAMES_SHORT[calViewMonth]} {calViewYear}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (calViewMonth === 11) {
                    setCalViewMonth(0);
                    setCalViewYear((y) => y + 1);
                  } else {
                    setCalViewMonth((m) => m + 1);
                  }
                }}
                className="size-8 rounded-full bg-[#f6f2ff] text-[#5300b7] font-bold flex items-center justify-center cursor-pointer hover:bg-[#ebddff]"
              >
                ›
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-['Hanken_Grotesk:Bold'] text-[#7b7486] py-1"
                >
                  {d}
                </span>
              ))}
              {(() => {
                const { leadingEmpty, daysCount } = getCalendarDaysInMonth(
                  calViewYear,
                  calViewMonth
                );
                const cells: React.ReactNode[] = [];
                for (let i = 0; i < leadingEmpty; i++) {
                  cells.push(<div key={`empty-${i}`} className="h-9" />);
                }
                for (let day = 1; day <= daysCount; day++) {
                  const iso = `${calViewYear}-${String(calViewMonth + 1).padStart(
                    2,
                    '0'
                  )}-${String(day).padStart(2, '0')}`;
                  const isSelected = iso === calSelectedIso;
                  const isToday = iso === todayDateKey;
                  cells.push(
                    <button
                      key={day}
                      type="button"
                      onClick={() => confirmCalendarSelection(iso)}
                      className={`h-9 rounded-[6px] text-[13px] font-['Hanken_Grotesk:SemiBold'] flex items-center justify-center cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#6d28d9] text-white shadow-sm'
                          : isToday
                          ? 'bg-[#ebddff] text-[#250059] border border-[#6d28d9]'
                          : 'bg-[#fcf8ff] text-[#181445] hover:bg-[#efebff]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                }
                return cells;
              })()}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#efebff]">
              <button
                type="button"
                onClick={() => confirmCalendarSelection(todayDateKey)}
                className="text-[12px] font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] cursor-pointer hover:underline"
              >
                Select Today
              </button>
              <button
                type="button"
                onClick={() => setCalendarTarget(null)}
                className="px-4 py-1.5 rounded-[6px] bg-[#efebff] text-[#4a4455] text-[12px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          POPUP MONTH & YEAR PICKER MODAL (For Leaderboard Month Selection)
         ===================================================================== */}
      {showMonthPickerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] p-5 w-full max-w-[348px] shadow-2xl border border-[rgba(204,195,215,0.45)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#efebff] pb-2.5">
              <span className="font-['Manrope:SemiBold'] text-[16px] text-[#181445]">
                Select Leaderboard Month
              </span>
              <button
                type="button"
                onClick={() => setShowMonthPickerModal(false)}
                className="text-[#7b7486] text-[13px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center justify-between px-2">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y - 1)}
                className="size-8 rounded-full bg-[#f6f2ff] text-[#5300b7] font-bold flex items-center justify-center cursor-pointer hover:bg-[#ebddff]"
              >
                ‹
              </button>
              <span className="font-['Manrope:Bold'] text-[18px] text-[#181445]">
                {pickerYear}
              </span>
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="size-8 rounded-full bg-[#f6f2ff] text-[#5300b7] font-bold flex items-center justify-center cursor-pointer hover:bg-[#ebddff]"
              >
                ›
              </button>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-3 gap-2">
              {MONTH_NAMES_SHORT.map((mName, idx) => {
                const candidateKey = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                const isSelected = candidateKey === selectedMonthKey;
                const isCurrentMonth = candidateKey === currentMonthKey;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setSelectedMonthKey(candidateKey);
                      setShowMonthPickerModal(false);
                    }}
                    className={`py-2.5 rounded-[6px] font-['Hanken_Grotesk:SemiBold'] text-[13px] cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#6d28d9] text-white shadow-sm'
                        : isCurrentMonth
                        ? 'bg-[#ebddff] text-[#250059] border border-[#6d28d9]'
                        : 'bg-[#f6f2ff] text-[#181445] hover:bg-[#e9e5ff]'
                    }`}
                  >
                    {mName} {pickerYear}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#efebff]">
              <button
                type="button"
                onClick={() => {
                  setSelectedMonthKey(currentMonthKey);
                  setShowMonthPickerModal(false);
                }}
                className="text-[12px] font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] cursor-pointer hover:underline"
              >
                Current Month ({currentDisplayMonth})
              </button>
              <button
                type="button"
                onClick={() => setShowMonthPickerModal(false)}
                className="px-4 py-1.5 rounded-[6px] bg-[#efebff] text-[#4a4455] text-[12px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal (Option 2: Firebase Password Reset Email Link) */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] p-5 w-full max-w-[364px] shadow-xl border border-[rgba(204,195,215,0.4)] flex flex-col gap-4">
            <div className="flex flex-col border-b border-[#efebff] pb-3">
              <span className="text-[10px] font-['Hanken_Grotesk:Bold'] text-[#6d28d9] uppercase tracking-wider">
                {forgotLinkSent ? 'Check Your Gmail Inbox' : 'Account Recovery'}
              </span>
              <h3 className="font-['Manrope:SemiBold'] text-[18px] text-[#181445]">
                {forgotLinkSent ? 'Reset Link Sent' : 'Forgot Password?'}
              </h3>
            </div>

            {!forgotLinkSent ? (
              <>
                <p className="font-['Hanken_Grotesk:Regular'] text-[13px] text-[#4a4455] leading-[19px]">
                  Enter your registered email address and we will send a Firebase password reset link directly to your Gmail inbox.
                </p>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">
                    Registered Email Address
                  </span>
                  <div className="relative">
                    <img
                      alt=""
                      className="absolute h-[12px] left-[13px] top-1/2 -translate-y-1/2 w-[15px]"
                      src="/assets/cf368.svg"
                    />
                    <input
                      type="email"
                      value={resetEmailInput}
                      onChange={(e) => setResetEmailInput(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-[rgba(204,195,215,0.8)] rounded-[4px] pl-10 pr-3 py-2.5 text-[14px] text-[#181445] outline-none"
                      autoFocus
                    />
                  </div>
                </label>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="px-4 py-2 rounded-[6px] bg-[#efebff] text-[#4a4455] text-[13px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={forgotLoading || Boolean(busyAction)}
                    onClick={handleSendResetLinkSubmit}
                    className="px-4 py-2 rounded-[6px] bg-[#6d28d9] text-white text-[13px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer hover:bg-[#5b21b6] disabled:opacity-60 flex items-center gap-2"
                  >
                    {forgotLoading || busyAction === 'forgot' ? (
                      <>
                        {renderSpinner('size-[13px]', 'border-white')}
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Reset Link →</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-[rgba(108,248,187,0.28)] border border-[rgba(0,108,73,0.25)] rounded-[6px] p-3.5 flex flex-col gap-1">
                  <span className="text-[#006c49] font-['Hanken_Grotesk:Bold'] text-[13px]">
                    ✓ Reset Email Sent to Gmail
                  </span>
                  <span className="text-[#181445] font-['Hanken_Grotesk:SemiBold'] text-[12px]">
                    {resetEmailInput}
                  </span>
                </div>

                <p className="font-['Hanken_Grotesk:Regular'] text-[13px] text-[#4a4455] leading-[19px]">
                  Open your Gmail inbox (and check your Spam/Promotions tab), click the password reset link from Firebase to choose your new password, then return here to sign in.
                </p>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={handleSendResetLinkSubmit}
                    className="text-[#6d28d9] text-[12px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer hover:underline"
                  >
                    {forgotLoading ? 'Resending...' : 'Resend Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotLinkSent(false);
                      setShowForgotPassword(false);
                    }}
                    className="px-5 py-2 rounded-[6px] bg-[#6d28d9] text-white text-[13px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer hover:bg-[#5b21b6]"
                  >
                    Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal with Profile Picture Upload, Linked Country/State Dropdowns & Open For Work Toggle */}
      {editingProfile && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] p-5 w-full max-w-[358px] shadow-xl border border-[rgba(204,195,215,0.4)] flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-['Manrope:SemiBold'] text-[18px] text-[#181445]">
              Edit Profile
            </h3>

            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="relative size-[84px] rounded-full overflow-hidden border-2 border-[#e9e5ff] shadow-sm">
                <img
                  alt="Avatar preview"
                  src={editPhoto || DEFAULT_DEMO_AVATAR}
                  className="size-full object-cover"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-[6px] bg-[#ebddff] text-[#250059] text-[12px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer hover:bg-[#dfd0ff]"
              >
                Upload Profile Picture
              </button>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">
                Full Name
              </span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border border-[rgba(204,195,215,0.8)] rounded-[4px] px-3 py-2 text-[14px] text-[#181445]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">
                Role / Profession
              </span>
              <input
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="border border-[rgba(204,195,215,0.8)] rounded-[4px] px-3 py-2 text-[14px] text-[#181445]"
              />
            </label>

            {/* Linked Country & State Dropdowns */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">
                  Country
                </span>
                <select
                  value={editCountry}
                  onChange={(e) => {
                    const nextC = e.target.value;
                    setEditCountry(nextC);
                    const nextStates = getStatesForCountry(nextC);
                    setEditState(nextStates[0] || '');
                  }}
                  className="border border-[rgba(204,195,215,0.8)] rounded-[4px] px-2 py-2 text-[13px] text-[#181445] bg-white"
                >
                  {ALL_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">
                  State / District
                </span>
                <select
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  className="border border-[rgba(204,195,215,0.8)] rounded-[4px] px-2 py-2 text-[13px] text-[#181445] bg-white"
                >
                  {getStatesForCountry(editCountry).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">
                Bio
              </span>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="border border-[rgba(204,195,215,0.8)] rounded-[4px] px-3 py-2 text-[13px] text-[#181445]"
              />
            </label>

            {/* Open For Work Toggle inside Edit Modal */}
            <div className="flex items-center justify-between py-2 px-3 bg-[#f6f2ff] rounded-[6px]">
              <div className="flex flex-col">
                <span className="text-[12px] font-['Hanken_Grotesk:SemiBold'] text-[#181445]">
                  Work Availability
                </span>
                <span className="text-[11px] text-[#4a4455]">
                  {editOpenForWork ? 'Open For Work' : 'Not Available'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditOpenForWork((p) => !p)}
                className={`w-[44px] h-[24px] rounded-full transition-colors p-0.5 cursor-pointer ${
                  editOpenForWork ? 'bg-[#006c49]' : 'bg-[#ccc3d7]'
                }`}
              >
                <div
                  className={`size-[20px] rounded-full bg-white shadow-xs transition-transform ${
                    editOpenForWork ? 'translate-x-[20px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 rounded-[6px] bg-[#efebff] text-[#4a4455] text-[13px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={Boolean(busyAction)}
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-[6px] bg-[#6d28d9] text-white text-[13px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer flex items-center gap-2 disabled:opacity-65 disabled:cursor-not-allowed"
              >
                {busyAction === 'save-profile' ? (
                  <>
                    {renderSpinner('size-[13px]', 'border-white')}
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Viewport Container */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#fcf8ff] overflow-hidden relative flex flex-col">
        {/* Top Black Status Bar Area for Mobile OS Icons (Time, SIM, Wi-Fi, Battery) */}
        <div className="w-full h-[28px] bg-black shrink-0 z-30" />

        {/* =====================================================================
            SCREEN 0: Entry White Splash Page (Displays only TaskoraLogo.png)
           ===================================================================== */}
        {activeScreen === 'entry' && (
          <div
            onClick={() => {
              const user = getCurrentSessionUser();
              if (user) {
                setCurrentUser(user);
                setActiveScreen('tasks');
              } else {
                setActiveScreen('guest-leaderboard');
              }
            }}
            className="bg-white flex-1 flex flex-col items-center justify-center p-8 w-full cursor-pointer select-none"
          >
            <img
              alt="Taskora"
              src="/assets/TaskoraLogo.png"
              className="w-[210px] max-w-[75%] h-auto object-contain"
            />
          </div>
        )}

        {/* =====================================================================
            SCREEN 1: All Tasks - Newsfeed & Hierarchical Expansion
           ===================================================================== */}
        {activeScreen === 'tasks' && (
          <div className="bg-[#fcf8ff] flex-1 flex flex-col items-start relative w-full">
            {/* Sticky App Header */}
            <div className="sticky top-0 backdrop-blur-[24px] bg-[rgba(252,248,255,0.92)] flex h-[64px] items-center justify-between px-[16px] shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] w-full z-20 shrink-0">
              <div
                onClick={() => setActiveScreen('tasks')}
                className="h-[32px] max-w-[132.13px] relative shrink-0 w-[132.13px] cursor-pointer"
              >
                <img
                  alt="Taskora"
                  className="h-full w-full object-contain object-left"
                  src="/assets/TaskoraLogo.png"
                />
              </div>
              <div className="flex gap-[4px] items-center">
                <button
                  onClick={() => setShowSearch((prev) => !prev)}
                  className="flex items-center justify-center rounded-full size-[44px] cursor-pointer hover:bg-[#efebff]/60"
                  aria-label="Search"
                >
                  <img alt="" className="size-[16.5px]" src="/assets/0ef90.svg" />
                </button>
                <div
                  onClick={() => setActiveScreen('profile')}
                  className="pl-[4px] relative cursor-pointer"
                >
                  <div className="relative rounded-full shadow-[0px_2px_8px_0px_rgba(109,40,217,0.12)] size-[32px] overflow-hidden">
                    <img
                      alt="Profile"
                      className="size-full object-cover"
                      src={currentUser?.profilePicture || DEFAULT_DEMO_AVATAR}
                    />
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 rounded-full size-[10px] shadow-[0px_0px_0px_2px_#fcf8ff] ${
                      currentUser?.openForWork ? 'bg-[#006c49]' : 'bg-[#7b7486]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-[20px] items-start pb-[112px] pt-[16px] px-[16px] w-full">
              {showSearch && (
                <div className="w-full bg-white border border-[rgba(109,40,217,0.3)] rounded-[6px] px-3 py-2 flex items-center gap-2 shadow-2xs">
                  <img alt="" className="size-[14px] opacity-60" src="/assets/0ef90.svg" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your tasks or subtasks..."
                    className="flex-1 text-[13px] text-[#181445] outline-none bg-transparent font-['Hanken_Grotesk:Regular']"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-[11px] text-[#5300b7] font-['Hanken_Grotesk:SemiBold'] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Free Account Ad Banner & 10 Daily Tasks Limit Status (Hidden when Subscribed) */}
              {currentUser && !currentUser.isSubscribed && (
                <div className="w-full bg-gradient-to-r from-[#f6f2ff] to-[#efebff] border border-[rgba(109,40,217,0.25)] rounded-[6px] p-3 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#ebddff] text-[#5300b7] text-[9px] font-['Hanken_Grotesk:Bold'] px-1.5 py-0.5 rounded-[3px] uppercase">
                        Sponsored • Free Plan
                      </span>
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[11px] truncate">
                        {todayNewTasksCount}/{FREE_DAILY_TASK_LIMIT} Daily Tasks Used
                      </span>
                    </div>
                    <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[11px] truncate">
                      Get unlimited daily tasks, remove ads &amp; contact profiles for {SUBSCRIPTION_PRICE_MONTHLY}/mo.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHireTargetUser(null);
                      setShowSubscriptionModal(true);
                    }}
                    className="bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-['Hanken_Grotesk:Bold'] text-[11px] px-3 py-1.5 rounded-[5px] shrink-0 cursor-pointer"
                  >
                    Go Pro ({SUBSCRIPTION_PRICE_MONTHLY})
                  </button>
                </div>
              )}

              {/* Daily Sanctuary Momentum Pill Card */}
              <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col gap-[6px] items-start p-[22px] relative rounded-[6px] shadow-[0px_4px_24px_-2px_rgba(109,40,217,0.06)] w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex gap-[6px] items-center">
                    <img alt="" className="h-[16.6px] w-[16.6px]" src="/assets/50d72.svg" />
                    <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px] leading-[24px]">
                      Today, {todayDisplayDate.replace(/, \d{4}$/, '')}
                    </span>
                  </div>
                  <div className="bg-[#e9e5ff] flex gap-[4px] items-center px-[10px] py-[4px] rounded-[4px]">
                    <span className="text-[14px] leading-[14px]">🔥</span>
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[13px] leading-[18px]">
                      {currentUser?.streakDays || 0} day streak
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-[4px] w-full">
                  <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                    {completedDailyCount} of {totalDailyCount} tasks completed
                  </span>
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#006c49] text-[13px]">
                    {flowPercentage}% Flow
                  </span>
                </div>

                <div className="bg-[#efebff] h-[8px] relative rounded-full w-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#6d28d9] via-[#7331df] to-[#006c49] h-full rounded-full transition-all"
                    style={{ width: `${flowPercentage}%` }}
                  />
                </div>

                <div className="flex gap-[6px] items-center pt-[4px] w-full">
                  <img alt="" className="size-[12.5px]" src="/assets/cfad0.svg" />
                  <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                    {totalDailyCount === 0
                      ? 'Tap the + button below to create your first task for today.'
                      : `Gentle, focused cadence. ${remainingDailyCount} tasks left for today.`}
                  </span>
                </div>
              </div>

              {/* Filter Carousel: All (Daily) -> Due Soon -> Completed */}
              <div className="flex gap-[6px] items-center w-full overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`${
                    taskFilter === 'all'
                      ? 'bg-[#5300b7] text-white'
                      : 'bg-[#f6f2ff] text-[#4a4455]'
                  } flex gap-[6px] items-center px-[14px] py-[6px] rounded-[6px] shrink-0 cursor-pointer`}
                >
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[13px]">All</span>
                  <span
                    className={`${
                      taskFilter === 'all'
                        ? 'bg-[rgba(255,255,255,0.2)] text-white'
                        : 'bg-[#e9e5ff] text-[#5300b7]'
                    } px-[6px] rounded-[4px] text-[11px] font-['Hanken_Grotesk:SemiBold']`}
                  >
                    {dailyTaskEntries.length}
                  </span>
                </button>

                {/* Due Soon placed in front of Completed */}
                <button
                  onClick={() => setTaskFilter('due-soon')}
                  className={`${
                    taskFilter === 'due-soon'
                      ? 'bg-[#5300b7] text-white'
                      : 'bg-[#f6f2ff] text-[#4a4455]'
                  } flex gap-[4px] items-center px-[14px] py-[6px] rounded-[6px] shrink-0 font-['Hanken_Grotesk:SemiBold'] text-[13px] cursor-pointer`}
                >
                  <img alt="" className="size-[11.667px]" src="/assets/fd1e7.svg" />
                  <span>Due Soon</span>
                </button>

                <button
                  onClick={() => setTaskFilter('completed')}
                  className={`${
                    taskFilter === 'completed'
                      ? 'bg-[#5300b7] text-white'
                      : 'bg-[#f6f2ff] text-[#4a4455]'
                  } px-[14px] py-[6px] rounded-[6px] shrink-0 font-['Hanken_Grotesk:SemiBold'] text-[13px] cursor-pointer`}
                >
                  Completed
                </button>
              </div>

              {/* Task Stream (No created date shown — only Due Date + Delete Button + 12h Lock) */}
              {filteredTaskEntries.length === 0 ? (
                <div className="bg-white border border-[rgba(204,195,215,0.3)] rounded-[6px] p-8 w-full flex flex-col items-center text-center gap-3 shadow-2xs">
                  <div className="size-[48px] rounded-full bg-[#f6f2ff] flex items-center justify-center">
                    <img alt="" className="size-[20px]" src="/assets/962dc.svg" />
                  </div>
                  <h3 className="font-['Manrope:SemiBold'] text-[#181445] text-[17px]">
                    {taskFilter === 'all'
                      ? 'No Daily Tasks Yet'
                      : taskFilter === 'due-soon'
                      ? 'No Due Soon Tasks'
                      : 'No Completed Tasks Yet'}
                  </h3>
                  <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[13px] max-w-[260px]">
                    {taskFilter === 'all'
                      ? 'Create your daily tasks and subtasks to build momentum.'
                      : taskFilter === 'due-soon'
                      ? 'All upcoming tasks are clear!'
                      : 'Completed tasks across all dates will appear here.'}
                  </p>
                  {taskFilter !== 'completed' && (
                    <button
                      onClick={openCreateNewTaskScreen}
                      className="mt-1 bg-[#6d28d9] text-white font-['Hanken_Grotesk:SemiBold'] text-[13px] px-5 py-2.5 rounded-[6px] cursor-pointer hover:bg-[#5b21b6]"
                    >
                      + Create Task
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-[16px] items-start w-full">
                  {filteredTaskEntries.map(({ task, monthKey, dateKey }) => {
                    const totalSub = task.subtasks.length;
                    const doneSub = task.subtasks.filter((s) => s.done).length;
                    const pct =
                      totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;
                    const isLocked = isTaskLockedAfter12Hours(task);

                    return (
                      <div
                        key={task.id}
                        className={`bg-white border ${
                          isLocked
                            ? 'border-[#ffdad6] bg-[#fffbfa]'
                            : 'border-[rgba(204,195,215,0.3)]'
                        } flex flex-col p-[22px] relative rounded-[6px] shadow-[0px_4px_24px_-2px_rgba(109,40,217,0.06)] w-full`}
                      >
                        <div className="flex gap-[8px] items-start justify-between w-full">
                          <div className="flex flex-1 flex-col items-start min-w-0">
                            {/* ONLY Due Date (No created date) + Daily Repeat Badge + Lock status if past 12h */}
                            <div className="flex items-center gap-2 pb-[4px] flex-wrap">
                              <div className="flex gap-[4px] items-center">
                                <img
                                  alt=""
                                  className="h-[10.8px] w-[9.75px]"
                                  src="/assets/6c169.svg"
                                />
                                <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                                  {task.dueDate}
                                </span>
                              </div>
                              {task.repeatDaily && (
                                <span className="bg-[#ebddff] text-[#5300b7] text-[10px] font-['Hanken_Grotesk:Bold'] px-2 py-0.5 rounded-[4px]">
                                  Daily
                                </span>
                              )}
                              {isLocked && (
                                <span className="bg-[#ffdad6] text-[#93000a] text-[10px] font-['Hanken_Grotesk:SemiBold'] px-2 py-0.5 rounded-[4px]">
                                  🔒 Locked (12h Past Due)
                                </span>
                              )}
                            </div>

                            <h2 className="font-['Manrope:SemiBold'] text-[#181445] text-[20px] leading-[28px] tracking-[-0.5px]">
                              {task.title}
                            </h2>
                          </div>

                          {/* Edit Task Button, Delete Task Button & Expand/Collapse Button */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenEditTask(monthKey, dateKey, task)
                              }
                              className="bg-[#efebff] border border-[rgba(83,0,183,0.18)] flex items-center justify-center rounded-full size-[32px] cursor-pointer hover:bg-[#dfd5ff]"
                              title="Edit Task"
                              aria-label="Edit Task"
                            >
                              <svg
                                width="13.5"
                                height="13.5"
                                viewBox="0 0 13.5 13.5"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="size-[13.5px]"
                              >
                                <path
                                  d="M1.5 12H2.56875L9.9 4.66875L8.83125 3.6L1.5 10.9312V12ZM0 13.5V10.3125L9.9 0.43125C10.05 0.29375 10.2156 0.1875 10.3969 0.1125C10.5781 0.0375 10.7688 0 10.9688 0C11.1687 0 11.3625 0.0375 11.55 0.1125C11.7375 0.1875 11.9 0.3 12.0375 0.45L13.0688 1.5C13.2188 1.6375 13.3281 1.8 13.3969 1.9875C13.4656 2.175 13.5 2.3625 13.5 2.55C13.5 2.75 13.4656 2.94062 13.3969 3.12188C13.3281 3.30313 13.2188 3.46875 13.0688 3.61875L3.1875 13.5H0Z"
                                  fill="#5300B7"
                                />
                              </svg>
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(busyAction)}
                              onClick={() =>
                                handleDeleteTaskCard(monthKey, dateKey, task.id)
                              }
                              className="bg-[#efebff] border border-[rgba(83,0,183,0.18)] flex items-center justify-center rounded-full size-[32px] cursor-pointer hover:bg-[#dfd5ff] disabled:opacity-65 disabled:cursor-not-allowed"
                              title="Delete Task"
                              aria-label="Delete Task"
                            >
                              {busyAction === `delete-${task.id}` ? (
                                renderSpinner('size-[13px]', 'border-[#5300B7]')
                              ) : (
                                <svg
                                  width="12"
                                  height="13.5"
                                  viewBox="0 0 12 13.5"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-[13.5px] w-[12px]"
                                >
                                  <path
                                    d="M2.25 13.5C1.8375 13.5 1.48438 13.3531 1.19062 13.0594C0.896875 12.7656 0.75 12.4125 0.75 12V2.25H0V0.75H3.75V0H8.25V0.75H12V2.25H11.25V12C11.25 12.4125 11.1031 12.7656 10.8094 13.0594C10.5156 13.3531 10.1625 13.5 9.75 13.5H2.25ZM9.75 2.25H2.25V12H9.75V2.25ZM3.75 10.5H5.25V3.75H3.75V10.5ZM6.75 10.5H8.25V3.75H6.75V10.5Z"
                                    fill="#5300B7"
                                  />
                                </svg>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (!currentUser) return;
                                toggleUserTaskExpanded(
                                  currentUser.uid,
                                  monthKey,
                                  dateKey,
                                  task.id
                                );
                                refreshFromDatabase();
                              }}
                              className="bg-[#efebff] border border-[rgba(83,0,183,0.18)] flex items-center justify-center rounded-full size-[32px] cursor-pointer hover:bg-[#dfd5ff]"
                              aria-label="Toggle Subtasks"
                            >
                              <div className={task.expanded ? 'rotate-180' : ''}>
                                <svg
                                  width="10"
                                  height="6.16667"
                                  viewBox="0 0 10 6.16667"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-[6.167px] w-[10px]"
                                >
                                  <path
                                    d="M5 6.16667L0 1.16667L1.16667 0L5 3.83333L8.83333 0L10 1.16667L5 6.16667Z"
                                    fill="#5300B7"
                                  />
                                </svg>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Full-Width Subtask Completion Progress Bar */}
                        <div className="flex flex-col gap-[6px] pt-[10px] w-full">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px]">
                              {doneSub} of {totalSub} subtasks completed
                            </span>
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[13px]">
                              {pct}%
                            </span>
                          </div>
                          <div className="bg-[#efebff] h-[7px] overflow-hidden relative rounded-full w-full">
                            <div
                              className="bg-gradient-to-r from-[#6d28d9] to-[#006c49] h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {task.expanded && task.subtasks.length > 0 && (
                          <div className="flex flex-col gap-[6px] pt-[16px] w-full">
                            {task.subtasks.map((sub) => (
                              <div
                                key={sub.id}
                                onClick={async () => {
                                  if (!currentUser) return;
                                  if (isLocked) {
                                    showToast(
                                      'Task is locked (more than 12 hours past due date).'
                                    );
                                    return;
                                  }
                                  await runWithLoadingLock(
                                    `subtask-${sub.id}`,
                                    async () => {
                                      try {
                                        await toggleUserSubtask(
                                          currentUser.uid,
                                          monthKey,
                                          dateKey,
                                          task.id,
                                          sub.id
                                        );
                                        refreshFromDatabase();
                                      } catch (err: any) {
                                        showToast(err?.message || 'Task is locked');
                                      }
                                    }
                                  );
                                }}
                                className={`${
                                  sub.done
                                    ? 'bg-[rgba(246,242,255,0.7)]'
                                    : isLocked
                                    ? 'bg-[#f5f2f7] opacity-75 cursor-not-allowed'
                                    : 'bg-[#f6f2ff] cursor-pointer'
                                } flex gap-[12px] items-center justify-between p-[12px] rounded-[5px] w-full`}
                              >
                                <div className="flex flex-1 gap-[12px] items-center min-w-0">
                                  <div
                                    className={`${
                                      sub.done ? 'bg-[#006c49]' : 'bg-[#e9e5ff]'
                                    } flex items-center justify-center rounded-full size-[20px] shrink-0`}
                                  >
                                    {busyAction === `subtask-${sub.id}` ? (
                                      renderSpinner(
                                        'size-[11px]',
                                        sub.done ? 'border-white' : 'border-[#5300b7]'
                                      )
                                    ) : (
                                      <img
                                        alt=""
                                        className="h-[7px] w-[9.5px]"
                                        src={
                                          sub.done
                                            ? '/assets/3ad68.svg'
                                            : '/assets/4167b.svg'
                                        }
                                      />
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span
                                      className={`text-[14px] leading-[20px] ${
                                        sub.done
                                          ? "font-['Hanken_Grotesk:Regular'] text-[#4a4455] line-through"
                                          : "font-['Hanken_Grotesk:Medium'] text-[#181445]"
                                      }`}
                                    >
                                      {sub.title}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`px-[8px] py-[2px] rounded-[4px] text-[11px] font-['Hanken_Grotesk:SemiBold'] shrink-0 ${
                                    sub.done
                                      ? 'bg-[#6cf8bb] text-[#00714d]'
                                      : isLocked
                                      ? 'bg-[#e5e0ec] text-[#4a4455]'
                                      : 'bg-[#ffdad6] text-[#93000a]'
                                  }`}
                                >
                                  {sub.done ? 'Done' : isLocked ? 'Locked' : 'Due'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Floating Create Task Button */}
            <button
              onClick={openCreateNewTaskScreen}
              className="fixed bottom-[80px] right-[calc(50%-195px)] max-sm:right-[16px] z-20 cursor-pointer"
              aria-label="Create Task"
            >
              <div className="bg-[#6d28d9] flex items-center justify-center rounded-full size-[56px] shadow-[0px_16px_40px_-6px_rgba(109,40,217,0.32)] hover:scale-105 transition-transform">
                <img alt="" className="size-[16.333px]" src="/assets/de4cd.svg" />
              </div>
            </button>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 max-w-[430px] w-full backdrop-blur-[24px] bg-[rgba(252,248,255,0.94)] shadow-[0px_-2px_12px_0px_rgba(109,40,217,0.04)] z-20">
              <div className="flex h-[64px] items-center justify-around px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('tasks')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="h-[13.819px] w-[18.333px]" src="/assets/962dc.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px]">
                    Tasks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('leaderboard')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[16.5px]" src="/assets/ff568.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                    Ranks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('profile')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[18.333px]" src="/assets/a3394.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                    Profile
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 2: User Profile - Productivity & Achievements
           ===================================================================== */}
        {activeScreen === 'profile' && (
          <div className="bg-[#fcf8ff] flex-1 flex flex-col items-start relative w-full">
            {/* Sticky App Header */}
            <div className="sticky top-0 backdrop-blur-[24px] bg-[rgba(252,248,255,0.92)] flex h-[64px] items-center justify-between px-[16px] shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] w-full z-20 shrink-0">
              <div
                onClick={() => setActiveScreen('tasks')}
                className="h-[32px] relative shrink-0 w-[132.13px] cursor-pointer"
              >
                <img
                  alt="Taskora"
                  className="size-full object-contain object-left"
                  src="/assets/TaskoraLogo.png"
                />
              </div>
              <div className="flex gap-[8px] items-center">
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-full bg-[#efebff] text-[#5300b7] text-[11px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer hover:bg-[#e0d4ff]"
                >
                  Sign Out
                </button>
                <div className="relative">
                  <div className="relative rounded-full shadow-xs size-[32px] overflow-hidden">
                    <img
                      alt="Profile"
                      className="size-full object-cover"
                      src={currentUser?.profilePicture || DEFAULT_DEMO_AVATAR}
                    />
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 rounded-full size-[10px] shadow-[0px_0px_0px_2px_#fcf8ff] ${
                      currentUser?.openForWork ? 'bg-[#006c49]' : 'bg-[#7b7486]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {!currentUser ? (
              <div className="p-8 flex flex-col items-center text-center gap-4 w-full">
                <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[14px]">
                  Please sign in or create an account to view your profile.
                </p>
                <button
                  onClick={() => setActiveScreen('login')}
                  className="bg-[#6d28d9] text-white px-5 py-2.5 rounded-[6px] font-['Hanken_Grotesk:SemiBold'] text-[13px] cursor-pointer"
                >
                  Go to Sign In
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-[20px] items-start pb-[112px] pt-[16px] px-[16px] w-full">
                {/* Profile Header Card */}
                <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col items-center p-[25px] rounded-[6px] shadow-[0px_8px_20px_-4px_rgba(109,40,217,0.12)] w-full gap-3">
                  <div
                    onClick={openEditProfileModal}
                    className="bg-[#e9e5ff] p-[4px] rounded-full size-[96px] relative cursor-pointer group"
                    title="Tap to change profile picture"
                  >
                    <img
                      alt={currentUser.name}
                      className="size-full rounded-full object-cover"
                      src={currentUser.profilePicture || DEFAULT_DEMO_AVATAR}
                    />
                    <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-['Hanken_Grotesk:SemiBold'] transition-opacity">
                      Change Photo
                    </div>
                  </div>

                  <h1 className="font-['Manrope:SemiBold'] text-[#181445] text-[24px] leading-[32px] text-center">
                    {currentUser.name}
                  </h1>

                  <div className="bg-[#ebddff] flex gap-[4px] items-center px-[10px] py-[2px] rounded-[4px]">
                    <img alt="" className="h-[7px] w-[11.667px]" src="/assets/50cbf.svg" />
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#250059] text-[11px]">
                      {currentUser.role}
                    </span>
                  </div>

                  <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[14px] leading-[22px] text-center max-w-[320px]">
                    {currentUser.bio}
                  </p>

                  <div className="flex flex-col gap-[6px] items-center pt-1">
                    <div className="flex gap-[4px] items-center">
                      <img alt="" className="h-[13.333px] w-[10.667px]" src="/assets/5d8e3.svg" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px]">
                        {currentUser.location}
                      </span>
                    </div>
                    <div className="flex gap-[4px] items-center">
                      <img alt="" className="h-[10.667px] w-[13.333px]" src="/assets/69050.svg" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px]">
                        {currentUser.email}
                      </span>
                    </div>
                  </div>

                  {/* Open For Work Interactive Toggle Button */}
                  <div className="w-full bg-[#f6f2ff] border border-[rgba(204,195,215,0.35)] rounded-[6px] px-4 py-3 flex items-center justify-between mt-1">
                    <div className="flex flex-col items-start">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px]">
                        Work Availability Status
                      </span>
                      <span
                        className={`font-['Hanken_Grotesk:SemiBold'] text-[11px] ${
                          currentUser.openForWork ? 'text-[#006c49]' : 'text-[#7b7486]'
                        }`}
                      >
                        {currentUser.openForWork ? 'Open For Work' : 'Not Available'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleOpenForWorkDirect}
                      aria-label="Toggle Open For Work status"
                      className={`w-[48px] h-[26px] rounded-full transition-colors p-0.5 cursor-pointer ${
                        currentUser.openForWork ? 'bg-[#006c49]' : 'bg-[#ccc3d7]'
                      }`}
                    >
                      <div
                        className={`size-[22px] rounded-full bg-white shadow-xs transition-transform ${
                          currentUser.openForWork ? 'translate-x-[22px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={openEditProfileModal}
                    className="bg-[#6d28d9] flex gap-[6px] h-[44px] items-center justify-center w-full rounded-[6px] shadow-[0px_8px_20px_-4px_rgba(109,40,217,0.3)] cursor-pointer hover:bg-[#5b21b6] mt-1"
                  >
                    <img alt="" className="size-[13.5px]" src="/assets/49219.svg" />
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[13px] text-white">
                      Edit Profile &amp; Photo
                    </span>
                  </button>
                </div>

                {/* Global Standing Card */}
                <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col gap-[16px] items-start p-[25px] rounded-[6px] shadow-[0px_8px_20px_-4px_rgba(109,40,217,0.12)] w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex gap-[10px] items-center">
                      <div className="bg-[rgba(108,248,187,0.3)] flex items-center justify-center rounded-[6px] size-[48px]">
                        <img alt="" className="h-[21.667px] w-[10.833px]" src="/assets/9dfcd.svg" />
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="flex gap-[8px] items-center">
                          <span className="font-['Manrope:SemiBold'] text-[#181445] text-[20px] leading-[28px]">
                            Rank #{currentUser.rankNumber}
                          </span>
                          <span
                            className={`px-[8px] py-[2px] rounded-[4px] font-['Hanken_Grotesk:SemiBold'] text-[11px] ${
                              currentUser.openForWork
                                ? 'bg-[rgba(108,248,187,0.4)] text-[#00714d]'
                                : 'bg-[#efebff] text-[#4a4455]'
                            }`}
                          >
                            {currentUser.openForWork ? 'Open For Work' : 'Not Available'}
                          </span>
                        </div>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                          {currentUser.location} Leaderboard
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#efebff] pt-[13px] flex gap-[8px] items-center w-full">
                    <button
                      onClick={handleToggleOpenForWorkDirect}
                      className="bg-[#5300b7] flex-1 h-[44px] rounded-[6px] flex gap-[6px] items-center justify-center cursor-pointer"
                    >
                      <img alt="" className="h-[14.25px] w-[15px]" src="/assets/ec69c.svg" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[13px] text-white">
                        {currentUser.openForWork ? 'Open For Work' : 'Not Available'}
                      </span>
                    </button>
                    <button
                      onClick={() => showToast('Profile card link copied!')}
                      className="bg-[#e9e5ff] flex-1 h-[44px] rounded-[6px] flex gap-[6px] items-center justify-center cursor-pointer"
                    >
                      <img alt="" className="h-[15px] w-[13.5px]" src="/assets/ce6da.svg" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px]">
                        Share Card
                      </span>
                    </button>
                  </div>
                </div>

                {/* Monthly Performance (4 Dynamic Metric Cards) */}
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center justify-between px-[4px] w-full">
                    <span className="font-['Manrope:SemiBold'] text-[#181445] text-[20px]">
                      Monthly Performance
                    </span>
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                      {currentDisplayMonth}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-[8px] pt-[8px] w-full">
                    <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col justify-between p-[17px] rounded-[6px] h-[122px]">
                      <div className="flex items-center justify-between w-full">
                        <img
                          alt="Tasks Completed"
                          className="size-[18.333px] shrink-0"
                          src="/assets/6de53.svg"
                        />
                      </div>
                      <div>
                        <p className="font-['Manrope:Bold'] text-[#181445] text-[24px] leading-[32px]">
                          {currentUser.tasksCompleted}
                        </p>
                        <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                          Tasks Completed
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col justify-between p-[17px] rounded-[6px] h-[122px]">
                      <div className="flex items-center justify-between w-full">
                        <img
                          alt="Completion Rate"
                          className="size-[18.333px] shrink-0"
                          src="/assets/69226.svg"
                        />
                      </div>
                      <div>
                        <p className="font-['Manrope:Bold'] text-[#181445] text-[24px] leading-[32px]">
                          {currentUser.completionRate}%
                        </p>
                        <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                          Completion Rate
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col justify-between p-[17px] rounded-[6px] h-[122px]">
                      <div className="flex items-center justify-between w-full">
                        <img alt="" className="h-[17.4px] w-[14.6px]" src="/assets/eb5b6.svg" />
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                          Daily
                        </span>
                      </div>
                      <div>
                        <p className="font-['Manrope:Bold'] text-[#181445] text-[24px] leading-[32px]">
                          {currentUser.streakDays} days
                        </p>
                        <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                          Current Streak
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col justify-between p-[17px] rounded-[6px] h-[122px]">
                      <div className="flex items-center justify-between w-full">
                        <img alt="" className="h-[18.3px] w-[16.5px]" src="/assets/9ba65.svg" />
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#006c49] text-[11px]">
                          {currentUser.productiveDaysCount}/30
                        </span>
                      </div>
                      <div>
                        <p className="font-['Manrope:Bold'] text-[#181445] text-[24px] leading-[32px]">
                          {currentUser.productiveDaysCount} days
                        </p>
                        <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                          Productive Days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Consistency Grid */}
                <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col gap-[16px] items-start p-[25px] rounded-[6px] w-full">
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <p className="font-['Manrope:SemiBold'] text-[#181445] text-[16px]">
                        Consistency Grid
                      </p>
                      <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                        {currentDisplayMonth} habit &amp; task activity
                      </p>
                    </div>
                    <div className="bg-[rgba(108,248,187,0.4)] px-[8px] py-[2px] rounded-[4px]">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#00714d] text-[11px]">
                        {currentMonthCompletedDays.length} Completed
                      </span>
                    </div>
                  </div>

                  <div className="gap-[6px] grid grid-cols-7 w-full">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} className="flex flex-col items-center py-[4px]">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                          {d}
                        </span>
                      </div>
                    ))}
                    {Array.from(
                      {
                        length: getCalendarDaysInMonth(
                          currentYear,
                          currentMonthIdx
                        ).daysCount,
                      },
                      (_, idx) => idx + 1
                    ).map((day) => {
                      const isToday = day === todayDayNum;
                      const isCompleted = currentMonthCompletedDays.includes(day);
                      return (
                        <div
                          key={day}
                          className={`h-[32px] rounded-[4px] flex items-center justify-center text-[12px] transition-colors ${
                            isCompleted && isToday
                              ? 'bg-[#006c49] text-white font-["Hanken_Grotesk:Bold"] border-2 border-[#004d34] shadow-[0px_0px_0px_2px_#6cf8bb]'
                              : isCompleted
                              ? 'bg-[#006c49] text-white font-["Hanken_Grotesk:SemiBold"]'
                              : isToday
                              ? 'bg-[#f6f2ff] border-2 border-[#006c49] text-[#006c49] font-["Hanken_Grotesk:Bold"]'
                              : 'bg-[#efebff] text-[#181445] font-["Hanken_Grotesk:SemiBold"]'
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#efebff] pt-[15px] flex items-center justify-between w-full">
                    <div className="flex gap-[6px] items-center">
                      <div className="bg-[#006c49] rounded-[4px] size-[12px]" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                        Completed
                      </span>
                    </div>
                    <div className="flex gap-[6px] items-center">
                      <div className="bg-[#efebff] border border-[rgba(204,195,215,0.3)] rounded-[4px] size-[12px]" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                        Incomplete
                      </span>
                    </div>
                    <div className="flex gap-[6px] items-center">
                      <div className="bg-[#f6f2ff] border-2 border-[#006c49] rounded-[4px] size-[12px]" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                        Today
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Floating + Button */}
            <button
              onClick={openCreateNewTaskScreen}
              className="fixed bottom-[80px] right-[calc(50%-195px)] max-sm:right-[16px] z-20 cursor-pointer"
            >
              <div className="bg-[#6d28d9] flex items-center justify-center rounded-full size-[56px] shadow-[0px_16px_40px_-6px_rgba(109,40,217,0.32)]">
                <img alt="" className="size-[16.333px]" src="/assets/de4cd.svg" />
              </div>
            </button>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 max-w-[430px] w-full backdrop-blur-[24px] bg-[rgba(252,248,255,0.94)] shadow-[0px_-2px_12px_0px_rgba(109,40,217,0.04)] z-20">
              <div className="flex h-[64px] items-center justify-around px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('tasks')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="h-[13.819px] w-[18.333px]" src="/assets/0b680.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                    Tasks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('leaderboard')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[16.5px]" src="/assets/ff568.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                    Ranks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('profile')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[18.333px]" src="/assets/78c98.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px]">
                    Profile
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 3: Leaderboard - Location Filtered Rankings
           ===================================================================== */}
        {activeScreen === 'leaderboard' && (
          <div className="bg-[#fcf8ff] flex-1 flex flex-col items-start relative w-full">
            {/* Sticky App Header */}
            <div className="sticky top-0 backdrop-blur-[24px] bg-[rgba(252,248,255,0.92)] flex h-[64px] items-center justify-between px-[16px] shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] w-full z-20 shrink-0">
              <div
                onClick={() => setActiveScreen('tasks')}
                className="h-[32px] relative w-[132.13px] cursor-pointer"
              >
                <img
                  alt="Taskora"
                  className="size-full object-contain object-left"
                  src="/assets/TaskoraLogo.png"
                />
              </div>
              <div className="flex gap-[4px] items-center">
                <button
                  onClick={() => {
                    setActiveScreen('tasks');
                    setShowSearch(true);
                  }}
                  className="flex items-center justify-center rounded-full size-[44px] cursor-pointer"
                >
                  <img alt="" className="size-[16.5px]" src="/assets/0ef90.svg" />
                </button>
                <div
                  onClick={() => setActiveScreen('profile')}
                  className="pl-[4px] relative cursor-pointer"
                >
                  <div className="relative rounded-full shadow-xs size-[32px] overflow-hidden">
                    <img
                      alt="Profile"
                      className="size-full object-cover"
                      src={currentUser?.profilePicture || DEFAULT_DEMO_AVATAR}
                    />
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 rounded-full size-[10px] shadow-[0px_0px_0px_2px_#fcf8ff] ${
                      currentUser?.openForWork ? 'bg-[#006c49]' : 'bg-[#7b7486]'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-start pb-[112px] pt-[16px] px-[16px] w-full">
              {renderDynamicLeaderboardSection(false)}
            </div>

            {/* Floating + Button */}
            <button
              onClick={openCreateNewTaskScreen}
              className="fixed bottom-[80px] right-[calc(50%-195px)] max-sm:right-[16px] z-20 cursor-pointer"
            >
              <div className="bg-[#6d28d9] flex items-center justify-center rounded-full size-[56px] shadow-[0px_16px_40px_-6px_rgba(109,40,217,0.32)]">
                <img alt="" className="size-[16.333px]" src="/assets/de4cd.svg" />
              </div>
            </button>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 max-w-[430px] w-full backdrop-blur-[24px] bg-[rgba(252,248,255,0.94)] shadow-[0px_-2px_12px_0px_rgba(109,40,217,0.04)] z-20">
              <div className="flex h-[64px] items-center justify-around px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('tasks')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="h-[13.819px] w-[18.333px]" src="/assets/0b680.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                    Tasks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('leaderboard')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[16.5px]" src="/assets/f6c90.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px]">
                    Ranks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('profile')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[18.333px]" src="/assets/a3394.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                    Profile
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 4: Create / Edit Task (Popup Calendar, Daily Repeat Toggle Beside Deadline, Toggleable Subtask Card, Save Button)
           ===================================================================== */}
        {activeScreen === 'create-task' && (
          <div className="bg-[#fcf8ff] flex-1 flex flex-col items-start relative w-full">
            {/* Sticky Header */}
            <div className="sticky top-0 backdrop-blur-[24px] bg-[rgba(252,248,255,0.92)] flex h-[64px] items-center justify-between px-[16px] shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] w-full z-20 shrink-0">
              <div className="flex gap-[8px] items-center">
                <button
                  onClick={() => {
                    setEditingTaskRef(null);
                    setActiveScreen('tasks');
                  }}
                  className="flex items-center justify-center rounded-full size-[44px] cursor-pointer hover:bg-[#efebff]/60"
                >
                  <img alt="Back" className="h-[20px] w-[11.775px]" src="/assets/8638b.svg" />
                </button>
                <span className="text-[14px] text-[rgba(204,195,215,0.6)]">|</span>
                <span className="font-['Manrope:SemiBold'] text-[#181445] text-[20px]">
                  {editingTaskRef ? 'Edit Task' : 'Create Task'}
                </span>
              </div>
              <div
                onClick={() => setActiveScreen('profile')}
                className="relative rounded-full shadow-xs size-[32px] overflow-hidden cursor-pointer"
              >
                <img
                  alt="Profile"
                  className="size-full object-cover"
                  src={currentUser?.profilePicture || DEFAULT_DEMO_AVATAR}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-[24px] items-start pb-[160px] pt-[16px] px-[16px] w-full">
              {/* Task Title & Popup Calendar Deadline + Daily Repeat Toggle Card */}
              <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col gap-[16px] items-start p-[25px] rounded-[6px] shadow-2xs w-full">
                <div className="flex flex-col gap-[4px] items-start w-full">
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px]">
                    Task Title
                  </span>
                  <div className="bg-white border border-[rgba(204,195,215,0.6)] flex items-center p-px rounded-[6px] w-full">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Enter your task title..."
                      className="flex-1 px-[14px] py-[10px] font-['Hanken_Grotesk:Regular'] text-[#181445] text-[15px] outline-none bg-transparent"
                    />
                    <div className="pr-[12px]">
                      <img alt="" className="h-[12px] w-[13.5px]" src="/assets/a896c.svg" />
                    </div>
                  </div>
                </div>

                {/* Task Deadline Box + Daily Repeat Turn ON/OFF Button Placed Side-by-Side */}
                <div className="flex items-end gap-[10px] w-full">
                  <div className="flex flex-1 flex-col gap-[4px] items-start min-w-0">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px]">
                      Deadline
                    </span>
                    <button
                      type="button"
                      onClick={() => openCalendarPopup()}
                      className="bg-white border border-[rgba(204,195,215,0.6)] flex items-center justify-between px-[12px] py-[11px] rounded-[6px] w-full cursor-pointer hover:border-[#6d28d9]"
                    >
                      <div className="flex gap-[8px] items-center min-w-0">
                        <img
                          alt=""
                          className="h-[15px] w-[13.5px] shrink-0"
                          src="/assets/5ca7c.svg"
                        />
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#181445] text-[14px] truncate">
                          {formatIsoDateToDisplay(newTaskDeadlineIso)}
                        </span>
                      </div>
                      <span className="bg-[#f6f2ff] text-[#5300b7] text-[11px] font-['Hanken_Grotesk:SemiBold'] px-2 py-1 rounded-[4px] shrink-0">
                        Select Date
                      </span>
                    </button>
                  </div>

                  {/* Daily Repeat Turn ON/OFF Toggle Beside Deadline Box (Default OFF) */}
                  <div className="flex flex-col gap-[4px] items-start shrink-0">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px]">
                      Repeat Daily
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewTaskRepeatDaily((prev) => !prev)}
                      className={`border flex items-center gap-[8px] px-[12px] py-[11px] rounded-[6px] cursor-pointer transition-colors ${
                        newTaskRepeatDaily
                          ? 'bg-[#efebff] border-[#6d28d9]'
                          : 'bg-white border-[rgba(204,195,215,0.6)]'
                      }`}
                      aria-label="Toggle Daily Repeat"
                    >
                      <span
                        className={`font-['Hanken_Grotesk:Bold'] text-[12px] ${
                          newTaskRepeatDaily ? 'text-[#5300b7]' : 'text-[#4a4455]'
                        }`}
                      >
                        Daily
                      </span>
                      <div
                        className={`w-[38px] h-[20px] rounded-full transition-colors p-0.5 flex items-center ${
                          newTaskRepeatDaily ? 'bg-[#006c49]' : 'bg-[#ccc3d7]'
                        }`}
                      >
                        <div
                          className={`size-[16px] rounded-full bg-white shadow-xs transition-transform ${
                            newTaskRepeatDaily ? 'translate-x-[18px]' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="flex flex-col gap-[16px] items-start w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex gap-[8px] items-center">
                    <span className="font-['Manrope:SemiBold'] text-[#181445] text-[20px]">
                      Subtasks
                    </span>
                    <div className="bg-[#e9e5ff] px-[8px] py-[2px] rounded-[4px]">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                        {draftSubtasks.length} items
                      </span>
                    </div>
                  </div>
                </div>

                {/* Added Subtasks List (Editable Title + Delete) */}
                <div className="flex flex-col gap-[10px] items-start w-full">
                  {draftSubtasks.map((st) => (
                    <div
                      key={st.id}
                      className="bg-white border border-[rgba(204,195,215,0.3)] flex gap-[8px] items-center pl-[17px] pr-[9px] py-[9px] rounded-[6px] w-full"
                    >
                      <div className="flex flex-1 gap-[8px] items-center min-w-0">
                        <img alt="" className="h-[12px] w-[7.5px] shrink-0" src="/assets/65c49.svg" />
                        <div className="bg-[#5300b7] rounded-full size-[8px] shrink-0" />
                        <input
                          type="text"
                          value={st.title}
                          onChange={(e) =>
                            handleUpdateDraftSubtaskTitle(st.id, e.target.value)
                          }
                          className="font-['Manrope:SemiBold'] text-[#181445] text-[15px] w-full outline-none bg-transparent"
                        />
                      </div>
                      <div className="flex gap-[4px] items-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftSubtask(st.id)}
                          className="flex items-center justify-center rounded-[4px] size-[32px] cursor-pointer hover:bg-[#ffdad6]/50"
                        >
                          <img alt="" className="h-[13.5px] w-[12px]" src="/assets/c10dc.svg" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!showNewSubtaskCard ? (
                    <button
                      type="button"
                      onClick={() => setShowNewSubtaskCard(true)}
                      className="bg-[#6d28d9] flex gap-[6px] items-center justify-center px-[18px] py-[10px] rounded-[6px] cursor-pointer hover:bg-[#5b21b6] shadow-xs"
                    >
                      <img alt="" className="size-[10px]" src="/assets/12237.svg" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[13px] text-white">
                        Add Subtask
                      </span>
                    </button>
                  ) : (
                    <div className="bg-white border-2 border-[rgba(109,40,217,0.4)] flex flex-col gap-[10px] items-start p-[18px] rounded-[6px] w-full">
                      <div className="border-b border-[rgba(204,195,215,0.3)] pb-[7px] w-full flex gap-[6px] items-center">
                        <img alt="" className="h-[15px] w-[16.5px]" src="/assets/74bc4.svg" />
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px]">
                          New Subtask
                        </span>
                      </div>

                      <div className="flex flex-col gap-[4px] items-start w-full">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                          Subtask Title
                        </span>
                        <input
                          type="text"
                          value={subtaskTitleInput}
                          onChange={(e) => setSubtaskTitleInput(e.target.value)}
                          placeholder="Enter subtask title..."
                          className="bg-white border border-[rgba(204,195,215,0.6)] px-[13px] py-[11px] rounded-[4px] w-full font-['Hanken_Grotesk:Regular'] text-[14px] text-[#181445] outline-none"
                          autoFocus
                        />
                      </div>

                      <div className="flex gap-[8px] items-center justify-end pt-[6px] w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setSubtaskTitleInput('');
                            setShowNewSubtaskCard(false);
                          }}
                          className="bg-[#efebff] px-[16px] py-[6px] rounded-[4px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddDraftSubtask}
                          className="bg-[#6d28d9] flex gap-[4px] items-center px-[24px] py-[6px] rounded-[4px] font-['Hanken_Grotesk:SemiBold'] text-white text-[13px] cursor-pointer hover:bg-[#5b21b6]"
                        >
                          <img alt="" className="h-[8.017px] w-[10.867px]" src="/assets/39b6c.svg" />
                          <span>Add Subtask</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Action Bar — Save Button */}
            <div className="fixed bottom-[64px] max-w-[430px] w-full backdrop-blur-[24px] bg-[rgba(252,248,255,0.94)] p-[16px] z-20">
              <div className="flex gap-[8px] items-center w-full">
                <button
                  onClick={() => {
                    setEditingTaskRef(null);
                    setActiveScreen('tasks');
                  }}
                  className="bg-[#e9e5ff] px-[24px] py-[12px] rounded-[6px] font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={Boolean(busyAction)}
                  onClick={handleCreateTaskSubmit}
                  className="bg-[#6d28d9] flex flex-1 gap-[8px] items-center justify-center px-[24px] py-[14px] rounded-[6px] shadow-md cursor-pointer hover:bg-[#5b21b6] disabled:opacity-65 disabled:cursor-not-allowed"
                >
                  {busyAction === 'save-task' ? (
                    <>
                      {renderSpinner('size-[16px]', 'border-white')}
                      <span className="font-['Manrope:SemiBold'] text-[16px] text-white">
                        Saving...
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-['Manrope:SemiBold'] text-[16px] text-white">
                        Save
                      </span>
                      <img alt="" className="size-[13.333px]" src="/assets/77060.svg" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 max-w-[430px] w-full backdrop-blur-[24px] bg-[rgba(252,248,255,0.94)] border-t border-[rgba(204,195,215,0.3)] z-20">
              <div className="flex h-[64px] items-center justify-around px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('tasks')}
                  className="flex flex-col gap-[2px] items-center justify-center cursor-pointer"
                >
                  <img alt="" className="h-[15.075px] w-[20px]" src="/assets/3a8dc.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px]">
                    Tasks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('leaderboard')}
                  className="flex flex-col gap-[2px] items-center justify-center cursor-pointer"
                >
                  <img alt="" className="size-[18px]" src="/assets/e4c37.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                    Ranks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('profile')}
                  className="flex flex-col gap-[2px] items-center justify-center cursor-pointer"
                >
                  <img alt="" className="size-[20px]" src="/assets/bc88d.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                    Profile
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 5: Taskora - Login
           ===================================================================== */}
        {activeScreen === 'login' && (
          <div className="flex-1 flex flex-col items-start relative w-full bg-[#fcf8ff]">
            {/* Header */}
            <div className="sticky top-0 backdrop-blur-[24px] bg-[rgba(252,248,255,0.9)] flex h-[64px] items-center justify-between px-[16px] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] w-full z-20">
              <button
                onClick={() => setActiveScreen('guest-leaderboard')}
                className="flex items-center justify-center rounded-full size-[44px] cursor-pointer"
              >
                <img alt="Back" className="h-[18.333px] w-[10.794px]" src="/assets/e1335.svg" />
              </button>
              <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px]">
                Sign In
              </span>
            </div>

            <div className="flex-1 flex flex-col items-start pb-[80px] pt-[16px] px-[16px] w-full">
              <div className="flex flex-col items-center justify-center pb-[24px] pt-[8px] px-[16px] w-full">
                <div className="w-[210px] flex justify-center">
                  <div className="aspect-[210/48] w-full max-h-[48px] relative">
                    <img
                      alt="Taskora Logo"
                      className="h-full w-full object-contain"
                      src="/assets/TaskoraLogo.png"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-[16px] items-start w-full">
                <div className="bg-[#efebff] flex items-center p-[4px] rounded-[6px] w-full">
                  <button
                    onClick={() => setActiveScreen('login')}
                    className="bg-white flex-1 py-[8px] rounded-[4px] font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] shadow-2xs cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setActiveScreen('signup')}
                    className="flex-1 py-[8px] rounded-[4px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px] cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>

                <div className="bg-white flex flex-col items-start p-[24px] rounded-[8px] shadow-[0px_4px_24px_-4px_rgba(83,0,183,0.06)] w-full">
                  <div className="flex flex-col gap-[16px] items-start w-full">
                    <div className="flex flex-col gap-[6px] items-start w-full">
                      <span className="font-['Hanken_Grotesk:Medium'] text-[#181445] text-[13px]">
                        Email or Username
                      </span>
                      <div className="bg-white flex items-center relative rounded-[4px] shadow-[inset_0px_0px_0px_1px_rgba(123,116,134,0.35)] w-full h-[44px]">
                        <img
                          alt=""
                          className="absolute h-[12px] left-[13.5px] top-[16px] w-[15px]"
                          src="/assets/cf368.svg"
                        />
                        <input
                          type="text"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full h-full pl-[40px] pr-[12px] font-['Hanken_Grotesk:Regular'] text-[#181445] placeholder:text-[#7b7486] text-[14px] outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-[6px] items-start w-full">
                      <span className="font-['Hanken_Grotesk:Medium'] text-[#181445] text-[13px]">
                        Password
                      </span>
                      <div className="bg-white flex items-center relative rounded-[4px] shadow-[inset_0px_0px_0px_1px_rgba(123,116,134,0.35)] w-full h-[44px]">
                        <img
                          alt=""
                          className="absolute h-[15.75px] left-[15px] top-[13.75px] w-[12px]"
                          src="/assets/06347.svg"
                        />
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full h-full px-[40px] font-['Hanken_Grotesk:Regular'] text-[#181445] placeholder:text-[#7b7486] text-[14px] outline-none bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((p) => !p)}
                          className="absolute right-[10px] top-[8px] h-[28px] w-[26px] cursor-pointer"
                        >
                          <img alt="" className="size-full" src="/assets/a6271.svg" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-[4px] w-full">
                      <label className="flex gap-[8px] items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="size-[16px] accent-[#6d28d9] rounded-[2.5px]"
                        />
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                          Remember me
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmailInput(loginEmail);
                          setForgotLinkSent(false);
                          setShowForgotPassword(true);
                        }}
                        className="font-['Hanken_Grotesk:SemiBold'] text-[#6d28d9] text-[13px] cursor-pointer hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      disabled={Boolean(busyAction)}
                      onClick={handleSignInSubmit}
                      className="bg-[#6d28d9] flex gap-[8px] h-[48px] items-center justify-center rounded-[6px] w-full cursor-pointer hover:bg-[#5b21b6] mt-1 disabled:opacity-65 disabled:cursor-not-allowed"
                    >
                      {busyAction === 'signin' ? (
                        <>
                          {renderSpinner('size-[16px]', 'border-white')}
                          <span className="font-['Manrope:SemiBold'] text-[16px] text-white">
                            Signing In...
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-['Manrope:SemiBold'] text-[16px] text-white">
                            Sign In
                          </span>
                          <img alt="" className="size-[12px]" src="/assets/03d99.svg" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 w-full pt-1">
                  <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[14px]">
                    Don&apos;t have an account?
                  </span>
                  <button
                    onClick={() => setActiveScreen('signup')}
                    className="font-['Hanken_Grotesk:SemiBold'] text-[#6d28d9] text-[13px] cursor-pointer"
                  >
                    Sign up
                  </button>
                </div>

                <div className="flex gap-[6px] items-center justify-center pt-[8px] w-full">
                  <img alt="" className="h-[13.333px] w-[10.667px]" src="/assets/5d128.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#7b7486] text-[11px]">
                    End-to-end 256-bit encrypted productivity workspace
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 6: Taskora - Sign Up (With Linked Country & State/District Dropdowns)
           ===================================================================== */}
        {activeScreen === 'signup' && (
          <div className="flex-1 flex flex-col items-start relative w-full bg-[#fcf8ff]">
            {/* Header */}
            <div className="sticky top-0 backdrop-blur-[24px] bg-[rgba(252,248,255,0.9)] flex h-[64px] items-center justify-between px-[16px] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] w-full z-20">
              <button
                onClick={() => setActiveScreen('login')}
                className="flex items-center justify-center rounded-full size-[44px] cursor-pointer"
              >
                <img alt="Back" className="h-[18.333px] w-[10.794px]" src="/assets/e1335.svg" />
              </button>
              <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px]">
                Create Account
              </span>
            </div>

            <div className="flex-1 flex flex-col items-start pb-[48px] pt-[12px] px-[16px] w-full">
              <div className="flex flex-col items-center pb-[24px] w-full">
                <div className="w-[192px]">
                  <div className="aspect-[192/46.5] w-full relative">
                    <img
                      alt="Taskora Logo"
                      className="size-full object-contain"
                      src="/assets/TaskoraLogo.png"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white flex flex-col items-start pb-[32px] pt-[20px] px-[20px] rounded-[8px] shadow-[0px_4px_24px_-4px_rgba(109,40,217,0.06)] w-full">
                <div className="flex flex-col gap-[14px] items-start w-full">
                  <div className="flex flex-col gap-[4px] items-start w-full">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] uppercase">
                      FULL NAME
                    </span>
                    <div className="relative w-full">
                      <img
                        alt=""
                        className="absolute left-[15.17px] size-[12.667px] top-[14.67px]"
                        src="/assets/ec3f6.svg"
                      />
                      <input
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="full name"
                        className="bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[40px] pr-[12px] py-[11px] rounded-[4px] text-[14px] text-[#181445] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-[4px] items-start w-full">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] uppercase">
                      EMAIL ADDRESS
                    </span>
                    <div className="relative w-full">
                      <img
                        alt=""
                        className="absolute h-[12.667px] left-[13.58px] top-[14.67px] w-[15.833px]"
                        src="/assets/986f0.svg"
                      />
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[40px] pr-[12px] py-[11px] rounded-[4px] text-[14px] text-[#181445] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-[4px] items-start w-full">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] uppercase">
                      ROLE / PROFESSION
                    </span>
                    <div className="relative w-full">
                      <img
                        alt=""
                        className="absolute left-[13.58px] size-[15.833px] top-[13.08px]"
                        src="/assets/a6832.svg"
                      />
                      <input
                        type="text"
                        value={signupRole}
                        onChange={(e) => setSignupRole(e.target.value)}
                        placeholder="e.g. Software Developer / Designer"
                        className="bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[40px] pr-[12px] py-[11px] rounded-[4px] text-[14px] text-[#181445] outline-none"
                      />
                    </div>
                  </div>

                  {/* Linked Country Dropdown + State/District Dropdown */}
                  <div className="flex gap-[12px] items-start w-full">
                    <div className="flex flex-1 flex-col gap-[4px] items-start min-w-0">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] uppercase">
                        COUNTRY
                      </span>
                      <div className="relative w-full">
                        <img
                          alt=""
                          className="absolute left-[12px] size-[15.833px] top-1/2 -translate-y-1/2 pointer-events-none"
                          src="/assets/be852.svg"
                        />
                        <select
                          value={signupCountry}
                          onChange={(e) => {
                            const selectedC = e.target.value;
                            setSignupCountry(selectedC);
                            const statesList = getStatesForCountry(selectedC);
                            setSignupState(statesList[0] || '');
                          }}
                          className="appearance-none bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[34px] pr-[24px] py-[10px] rounded-[4px] text-[13px] text-[#181445] outline-none cursor-pointer truncate"
                        >
                          {ALL_COUNTRIES.map((countryName) => (
                            <option key={countryName} value={countryName}>
                              {countryName}
                            </option>
                          ))}
                        </select>
                        <img
                          alt=""
                          className="absolute h-[5.858px] right-[9px] top-1/2 -translate-y-1/2 w-[9.5px] pointer-events-none"
                          src="/assets/f6a07.svg"
                        />
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-[4px] items-start min-w-0">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] uppercase">
                        STATE / DISTRICT
                      </span>
                      <div className="relative w-full">
                        <img
                          alt=""
                          className="absolute h-[15.833px] left-[12px] top-1/2 -translate-y-1/2 w-[12.667px] pointer-events-none"
                          src="/assets/d3de2.svg"
                        />
                        <select
                          value={signupState}
                          onChange={(e) => setSignupState(e.target.value)}
                          className="appearance-none bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[32px] pr-[24px] py-[10px] rounded-[4px] text-[13px] text-[#181445] outline-none cursor-pointer truncate"
                        >
                          {getStatesForCountry(signupCountry).map((stateName) => (
                            <option key={stateName} value={stateName}>
                              {stateName}
                            </option>
                          ))}
                        </select>
                        <img
                          alt=""
                          className="absolute h-[5.858px] right-[9px] top-1/2 -translate-y-1/2 w-[9.5px] pointer-events-none"
                          src="/assets/f6a07.svg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-[4px] items-start w-full">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] uppercase">
                      PASSWORD
                    </span>
                    <div className="relative w-full">
                      <img
                        alt=""
                        className="absolute h-[16.625px] left-[15.17px] top-[12.29px] w-[12.667px]"
                        src="/assets/607d0.svg"
                      />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Create password"
                        className="bg-white border border-[rgba(204,195,215,0.45)] w-full px-[40px] py-[11px] rounded-[4px] text-[14px] text-[#181445] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((p) => !p)}
                        className="absolute right-[10px] top-[5px] size-[32px] flex items-center justify-center cursor-pointer"
                      >
                        <img alt="" className="h-[11.875px] w-[17.417px]" src="/assets/793d2.svg" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-[4px] pt-[4px] w-full">
                      <div className="flex gap-[6px] h-[6px] w-full">
                        <div
                          className={`flex-1 h-full rounded-[2px] ${
                            passwordStrength >= 1 ? 'bg-[#6d28d9]' : 'bg-[#e9e5ff]'
                          }`}
                        />
                        <div
                          className={`flex-1 h-full rounded-[2px] ${
                            passwordStrength >= 2 ? 'bg-[#6d28d9]' : 'bg-[#e9e5ff]'
                          }`}
                        />
                        <div
                          className={`flex-1 h-full rounded-[2px] ${
                            passwordStrength >= 3 ? 'bg-[#006c49]' : 'bg-[#e9e5ff]'
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-between px-[2px] w-full">
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#7b7486] text-[12px]">
                          Strength
                        </span>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#7b7486] text-[11px]">
                          {passwordStrength === 0
                            ? 'Enter password'
                            : passwordStrength === 1
                            ? 'Weak'
                            : passwordStrength === 2
                            ? 'Good'
                            : 'Strong'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-[4px] items-start w-full">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] uppercase">
                      CONFIRM PASSWORD
                    </span>
                    <div className="relative w-full">
                      <img
                        alt=""
                        className="absolute h-[15.833px] left-[15.17px] top-[13.08px] w-[12.667px]"
                        src="/assets/0af4b.svg"
                      />
                      <input
                        type={showSignupConfirm ? 'text' : 'password'}
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="bg-white border border-[rgba(204,195,215,0.45)] w-full px-[40px] py-[11px] rounded-[4px] text-[14px] text-[#181445] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirm((p) => !p)}
                        className="absolute right-[10px] top-[5px] size-[32px] flex items-center justify-center cursor-pointer"
                      >
                        <img alt="" className="h-[11.875px] w-[17.417px]" src="/assets/793d2.svg" />
                      </button>
                    </div>
                  </div>

                  <label className="flex gap-[10px] items-center pt-[4px] w-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="size-[16px] accent-[#6d28d9] rounded-[3px]"
                    />
                    <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                      I agree to the{' '}
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#6d28d9]">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#6d28d9]">
                        Privacy Policy
                      </span>
                    </span>
                  </label>

                  <button
                    disabled={Boolean(busyAction)}
                    onClick={handleSignUpSubmit}
                    className="bg-[#6d28d9] flex gap-[8px] items-center justify-center py-[12px] rounded-[6px] shadow-md w-full cursor-pointer hover:bg-[#5b21b6] mt-1 disabled:opacity-65 disabled:cursor-not-allowed"
                  >
                    {busyAction === 'signup' ? (
                      <>
                        {renderSpinner('size-[16px]', 'border-white')}
                        <span className="font-['Manrope:SemiBold'] text-[16px] text-white">
                          Creating Account...
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-['Manrope:SemiBold'] text-[16px] text-white">
                          Create Account
                        </span>
                        <img alt="" className="size-[12px]" src="/assets/03d99.svg" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-[4px] items-center justify-center pt-[24px] w-full text-[14px]">
                <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455]">
                  Already have an account?
                </span>
                <button
                  onClick={() => setActiveScreen('login')}
                  className="font-['Hanken_Grotesk:SemiBold'] text-[#6d28d9] cursor-pointer"
                >
                  Log in
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 7: Taskora - Guest Home Leaderboard
           ===================================================================== */}
        {activeScreen === 'guest-leaderboard' && (
          <div className="bg-[#fcf8ff] flex-1 flex flex-col items-start relative w-full">
            {/* Guest Sticky Header */}
            <div className="sticky top-0 backdrop-blur-[24px] bg-[rgba(252,248,255,0.92)] flex h-[64px] items-center justify-between px-[16px] shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] w-full z-20 shrink-0">
              <div className="h-[32px] relative w-[132.13px]">
                <img
                  alt="Taskora"
                  className="size-full object-contain object-left"
                  src="/assets/TaskoraLogo.png"
                />
              </div>
              <div className="flex gap-[4px] items-center">
                <button
                  onClick={() => setActiveScreen('login')}
                  className="bg-[#ebddff] flex gap-[6px] items-center px-[12px] py-[6px] rounded-full cursor-pointer hover:bg-[#dfd0ff]"
                >
                  <img alt="" className="size-[12px]" src="/assets/eac4d.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#250059] text-[13px]">
                    Log In
                  </span>
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-start pb-[112px] pt-[16px] px-[16px] w-full">
              {/* Guest Login / Signup & To-Do List Task Manager Banner Card */}
              <div
                className="border border-[rgba(83,0,183,0.2)] flex flex-col items-start overflow-clip p-[17px] relative rounded-[6px] shadow-md w-full mb-4"
                style={{
                  backgroundImage:
                    'linear-gradient(27.7deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 50%, rgb(246, 242, 255) 100%)',
                }}
              >
                <div className="absolute bg-[rgba(235,221,255,0.3)] blur-[40px] right-[-32px] rounded-full size-[112px] top-[-32px]" />
                <div className="flex flex-col gap-[12px] items-start relative w-full">
                  <div className="bg-[#ebddff] px-[10px] py-[2px] rounded-[4px]">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#250059] text-[11px] tracking-[0.55px] uppercase">
                      TO-DO LIST &amp; DAILY TASK MANAGER
                    </span>
                  </div>
                  <div className="flex flex-col gap-[4px] items-start w-full">
                    <span className="font-['Manrope:Bold'] text-[#181445] text-[18px] leading-[24px]">
                      Join or Sign In to Taskora — To-Do List &amp; Task Management
                    </span>
                    <p className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                      Taskora is your smart to-do list task manager. Organize daily tasks &amp; subtasks, set popup calendar deadlines, automate daily repeating tasks, and climb the monthly productivity leaderboard.
                    </p>
                  </div>

                  {/* To-Do List Task Manager Feature Highlights for Guests */}
                  <div className="grid grid-cols-1 gap-2 w-full bg-[#fcf8ff] border border-[rgba(204,195,215,0.35)] rounded-[6px] p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="size-[24px] rounded-[5px] bg-[#ebddff] text-[#5300b7] flex items-center justify-center text-[12px] font-bold shrink-0">
                        ✓
                      </div>
                      <div className="flex flex-col">
                        <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[12px]">
                          Daily To-Do Lists &amp; Step-by-Step Subtasks
                        </span>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[11px]">
                          Create daily tasks, break goals into checklists, and track your real-time completion progress bar.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="size-[24px] rounded-[5px] bg-[#ebddff] text-[#5300b7] flex items-center justify-center text-[12px] font-bold shrink-0">
                        🔁
                      </div>
                      <div className="flex flex-col">
                        <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[12px]">
                          Deadlines, Popup Calendar &amp; Daily Repeat
                        </span>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[11px]">
                          Schedule deadlines with a popup calendar and turn on automatic daily repeating to-do tasks.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="size-[24px] rounded-[5px] bg-[rgba(108,248,187,0.4)] text-[#006c49] flex items-center justify-center text-[12px] font-bold shrink-0">
                        📊
                      </div>
                      <div className="flex flex-col">
                        <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[12px]">
                          Consistency Calendar Grid &amp; Global Rankings
                        </span>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[11px]">
                          Turn calendar days green as you complete tasks and rank among top performers worldwide.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[rgba(204,195,215,0.2)] flex gap-[8px] items-center pt-[8px] w-full">
                    <button
                      onClick={() => setActiveScreen('login')}
                      className="bg-[#5300b7] flex-1 flex gap-[6px] items-center justify-center px-[12px] py-[8px] rounded-[6px] cursor-pointer hover:bg-[#430096]"
                    >
                      <img alt="" className="size-[12px]" src="/assets/52f1c.svg" />
                      <span className="font-['Hanken_Grotesk:Bold'] text-[13px] text-white">
                        Log In
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveScreen('signup')}
                      className="bg-[#ebddff] border border-[rgba(83,0,183,0.2)] flex-1 flex gap-[6px] items-center justify-center px-[13px] py-[9px] rounded-[6px] cursor-pointer hover:bg-[#dfd0ff]"
                    >
                      <img alt="" className="h-[10.667px] w-[14.667px]" src="/assets/25526.svg" />
                      <span className="font-['Hanken_Grotesk:Bold'] text-[#250059] text-[13px]">
                        Sign Up
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {renderDynamicLeaderboardSection(true)}
            </div>

            {/* Floating + Button */}
            <button
              onClick={() => setActiveScreen('login')}
              className="fixed bottom-[80.5px] right-[calc(50%-195px)] max-sm:right-[16px] z-20 cursor-pointer"
            >
              <div className="bg-[#6d28d9] flex items-center justify-center rounded-full size-[56px] shadow-[0px_16px_40px_-6px_rgba(109,40,217,0.32)]">
                <img alt="" className="size-[16.333px]" src="/assets/de4cd.svg" />
              </div>
            </button>

            {/* Guest Bottom Nav */}
            <div className="fixed bottom-0 max-w-[430px] w-full backdrop-blur-[24px] bg-[rgba(252,248,255,0.94)] shadow-[0px_-2px_12px_0px_rgba(109,40,217,0.04)] z-20">
              <div className="flex h-[64px] items-center justify-around px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('guest-leaderboard')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="h-[16.5px] w-[14.667px]" src="/assets/97194.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px]">
                    Home
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('login')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[16.5px]" src="/assets/f44c8.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                    Log In
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
