import React, { useState, useEffect } from 'react';

export type ScreenId =
  | 'tasks'
  | 'profile'
  | 'leaderboard'
  | 'create-task'
  | 'login'
  | 'signup'
  | 'guest-leaderboard';

export interface SubtaskItem {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  totalCount: number;
  completedCount: number;
  expanded: boolean;
  subtasks: SubtaskItem[];
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Develop a Website',
    dueDate: 'Due 15 Nov',
    totalCount: 5,
    completedCount: 3,
    expanded: false,
    subtasks: [
      { id: 's1-1', title: 'Design system tokens & typography setup', done: true },
      { id: 's1-2', title: 'Responsive landing page hero & navigation', done: true },
      { id: 's1-3', title: 'Interactive component showcase', done: true },
      { id: 's1-4', title: 'Performance & Lighthouse optimization', done: false },
      { id: 's1-5', title: 'Production deployment & DNS verification', done: false },
    ],
  },
  {
    id: 'task-2',
    title: 'Mobile Architecture & System',
    dueDate: 'Due 20 Nov',
    totalCount: 6,
    completedCount: 2,
    expanded: true,
    subtasks: [
      { id: 's2-1', title: 'Core state architecture setup', done: true },
      { id: 's2-2', title: 'Navigation graph primitives', done: true },
      { id: 's2-3', title: 'Offline SQLite synchronizer', done: false },
    ],
  },
  {
    id: 'task-3',
    title: 'Launch Q4 Marketing Strategy',
    dueDate: 'Due 28 Nov',
    totalCount: 4,
    completedCount: 0,
    expanded: true,
    subtasks: [
      { id: 's3-1', title: 'Audience segmentation &\npersona synthesis', done: false },
      { id: 's3-2', title: 'Ad copy variations & creative\nassets', done: false },
    ],
  },
];

const CONSISTENCY_COMPLETED_INITIAL = [1, 2, 4, 5, 6, 7, 8, 9, 11, 12, 13];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('tasks');
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem('taskora_tasks_v1');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });
  const [taskFilter, setTaskFilter] = useState<'all' | 'completed' | 'due-soon'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create Task state matching Figma screen 2:864
  const [newTaskTitle, setNewTaskTitle] = useState('Redesign Onboarding Flow');
  const [newTaskDeadline, setNewTaskDeadline] = useState('18 Nov 2026, 5:00 PM');
  const [draftSubtasks, setDraftSubtasks] = useState<{ id: string; title: string; date: string }[]>([
    { id: 'ds-1', title: 'User journey audit', date: '14 Nov' },
    { id: 'ds-2', title: 'High-fidelity wireframes', date: '16 Nov' },
  ]);
  const [subtaskTitleInput, setSubtaskTitleInput] = useState('');
  const [subtaskDateInput, setSubtaskDateInput] = useState('11/18/2026');

  // Profile state matching Figma screen 2:216
  const [profileName, setProfileName] = useState('Alex Morgan');
  const [profileRole, setProfileRole] = useState('Software Developer');
  const [profileBio, setProfileBio] = useState(
    'Building better habits and creating meaningful things. Passionate about clean code and design systems.'
  );
  const [profileLocation, setProfileLocation] = useState('San Francisco, CA');
  const [profileEmail, setProfileEmail] = useState('alex.morgan@gmail.com');
  const [editingProfile, setEditingProfile] = useState(false);
  const [completedDays, setCompletedDays] = useState<number[]>(CONSISTENCY_COMPLETED_INITIAL);

  // Leaderboard state matching Figma screen 2:486 & 2:1209
  const [locationScope, setLocationScope] = useState<'sf' | 'global'>('sf');
  const [selectedPeriod, setSelectedPeriod] = useState('Nov 2026');

  // Login & Signup state matching Figma screens 2:1024 & 2:1092
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState('');
  const [signupCountry, setSignupCountry] = useState('United States');
  const [signupState, setSignupState] = useState('California');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('taskora_tasks_v1', JSON.stringify(tasks));
    } catch {
      // ignore storage errors
    }
  }, [tasks]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const toggleTaskExpand = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, expanded: !t.expanded } : t))
    );
  };

  const toggleSubtaskDone = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updatedSubtasks = t.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, done: !s.done } : s
        );
        const target = t.subtasks.find((s) => s.id === subtaskId);
        const delta = target ? (target.done ? -1 : 1) : 0;
        const nextCompleted = Math.max(0, Math.min(t.totalCount, t.completedCount + delta));
        return {
          ...t,
          subtasks: updatedSubtasks,
          completedCount: nextCompleted,
        };
      })
    );
  };

  const handleAddDraftSubtask = () => {
    if (!subtaskTitleInput.trim()) {
      showToast('Please enter a subtask title');
      return;
    }
    const formattedDate = subtaskDateInput.includes('/')
      ? '18 Nov'
      : subtaskDateInput;
    setDraftSubtasks((prev) => [
      ...prev,
      {
        id: `ds-${Date.now()}`,
        title: subtaskTitleInput.trim(),
        date: formattedDate,
      },
    ]);
    setSubtaskTitleInput('');
    showToast('Subtask added');
  };

  const handleRemoveDraftSubtask = (id: string) => {
    setDraftSubtasks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCreateTaskSubmit = () => {
    if (!newTaskTitle.trim()) {
      showToast('Please enter a task title');
      return;
    }
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      dueDate: `Due ${newTaskDeadline.split(',')[0] || '18 Nov'}`,
      totalCount: Math.max(1, draftSubtasks.length),
      completedCount: 0,
      expanded: true,
      subtasks: draftSubtasks.map((d) => ({
        id: d.id,
        title: d.title,
        done: false,
        dueDate: d.date,
      })),
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast('Task created in Taskora!');
    setActiveScreen('tasks');
  };

  const toggleCalendarDay = (day: number) => {
    if (day === 14) return; // Today
    setCompletedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchSub = t.subtasks.some((s) => s.title.toLowerCase().includes(q));
      if (!matchTitle && !matchSub) return false;
    }
    if (taskFilter === 'completed') {
      return t.completedCount >= t.totalCount || t.completedCount > 0;
    }
    if (taskFilter === 'due-soon') {
      return t.dueDate.includes('15') || t.dueDate.includes('20');
    }
    return true;
  });

  const passwordStrength =
    signupPassword.length === 0
      ? 0
      : signupPassword.length < 6
      ? 1
      : signupPassword.length < 10
      ? 2
      : 3;

  const screensList: { id: ScreenId; label: string }[] = [
    { id: 'tasks', label: '1. All Tasks' },
    { id: 'profile', label: '2. User Profile' },
    { id: 'leaderboard', label: '3. Leaderboard' },
    { id: 'create-task', label: '4. Create Task' },
    { id: 'login', label: '5. Login' },
    { id: 'signup', label: '6. Sign Up' },
    { id: 'guest-leaderboard', label: '7. Guest Home' },
  ];

  return (
    <div className="min-h-screen bg-[#181445]/8 flex flex-col items-center justify-start py-0 sm:py-6">
      {/* Top Figma Screen Switcher Bar for easy testing of all 7 Figma frames */}
      <div className="w-full max-w-[820px] px-3 py-2 mb-0 sm:mb-3 flex flex-wrap items-center justify-center gap-1.5 bg-white/90 backdrop-blur-md sm:rounded-full shadow-sm border border-[rgba(204,195,215,0.4)] z-50">
        <span className="text-[11px] font-['Hanken_Grotesk:Bold'] text-[#5300b7] uppercase tracking-wider px-2">
          Figma Screens:
        </span>
        {screensList.map((scr) => (
          <button
            key={scr.id}
            onClick={() => setActiveScreen(scr.id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-['Hanken_Grotesk:SemiBold'] transition-all cursor-pointer ${
              activeScreen === scr.id
                ? 'bg-[#6d28d9] text-white shadow-sm'
                : 'bg-[#f6f2ff] text-[#4a4455] hover:bg-[#ebddff]'
            }`}
          >
            {scr.label}
          </button>
        ))}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#181445] text-white px-4 py-2 rounded-full text-[12px] font-['Hanken_Grotesk:SemiBold'] shadow-lg flex items-center gap-2 animate-bounce">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] p-5 w-full max-w-[358px] shadow-xl border border-[rgba(204,195,215,0.4)] flex flex-col gap-3">
            <h3 className="font-['Manrope:SemiBold'] text-[18px] text-[#181445]">Edit Profile</h3>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">Name</span>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="border border-[rgba(204,195,215,0.8)] rounded-[4px] px-3 py-2 text-[14px] text-[#181445]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">Role</span>
              <input
                value={profileRole}
                onChange={(e) => setProfileRole(e.target.value)}
                className="border border-[rgba(204,195,215,0.8)] rounded-[4px] px-3 py-2 text-[14px] text-[#181445]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">Location</span>
              <input
                value={profileLocation}
                onChange={(e) => setProfileLocation(e.target.value)}
                className="border border-[rgba(204,195,215,0.8)] rounded-[4px] px-3 py-2 text-[14px] text-[#181445]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] uppercase">Bio</span>
              <textarea
                rows={3}
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="border border-[rgba(204,195,215,0.8)] rounded-[4px] px-3 py-2 text-[13px] text-[#181445]"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 rounded-[6px] bg-[#efebff] text-[#4a4455] text-[13px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setEditingProfile(false);
                  showToast('Profile updated!');
                }}
                className="px-4 py-2 rounded-[6px] bg-[#6d28d9] text-white text-[13px] font-['Hanken_Grotesk:SemiBold'] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Viewport Container matching exact Figma 390px/391px frame width */}
      <div className="w-full max-w-[391px] bg-[#fcf8ff] sm:rounded-[24px] shadow-[0px_20px_60px_-15px_rgba(24,20,69,0.18)] overflow-hidden relative border border-[rgba(204,195,215,0.35)]">
        {/* =====================================================================
            SCREEN 1: All Tasks - Newsfeed & Hierarchical Expansion (node 2:2)
           ===================================================================== */}
        {activeScreen === 'tasks' && (
          <div
            className="bg-[#fcf8ff] content-stretch flex flex-col items-start relative w-full min-h-[844px]"
            data-node-id="2:2"
            data-name="All Tasks - Newsfeed & Hierarchical Expansion"
          >
            <div
              className="bg-[#fcf8ff] content-stretch flex flex-col items-start min-h-[782px] pb-[112px] pt-[96px] relative shrink-0 w-full"
              data-node-id="2:3"
              data-name="Main"
            >
              <div
                className="content-stretch flex flex-col gap-[24px] items-start pb-[24px] px-[16px] relative shrink-0 w-full"
                data-node-id="2:4"
                data-name="Container"
              >
                {/* Optional interactive search input when search icon clicked */}
                {showSearch && (
                  <div className="w-full bg-white border border-[rgba(109,40,217,0.3)] rounded-[6px] px-3 py-2 flex items-center gap-2 shadow-xs">
                    <img alt="" className="size-[14px] opacity-60" src="/assets/0ef90.svg" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks or subtasks..."
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

                {/* Section - Daily Sanctuary Momentum Pill Card */}
                <div
                  className="bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch flex flex-col gap-[4px] items-start p-[25px] relative rounded-[6px] shrink-0 w-full"
                  data-node-id="2:5"
                  data-name="Section - Daily Sanctuary Momentum Pill Card"
                >
                  <div
                    className="absolute bg-[rgba(255,255,255,0)] inset-[-1px] rounded-[6px] shadow-[0px_4px_24px_-2px_rgba(109,40,217,0.06),0px_2px_8px_-1px_rgba(24,20,69,0.02)] pointer-events-none"
                    data-node-id="2:6"
                  />
                  <div className="relative shrink-0 w-full" data-node-id="2:7">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between relative size-full">
                      <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-node-id="2:8">
                        <div className="h-[16.667px] relative shrink-0 w-[16.625px]" data-node-id="2:9">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/50d72.svg" />
                        </div>
                        <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0" data-node-id="2:11">
                          <div
                            className="flex flex-col font-['Manrope:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#181445] text-[16px] tracking-[-0.16px] whitespace-nowrap"
                            data-node-id="2:12"
                          >
                            <p className="leading-[24px]">Today, Nov 12</p>
                          </div>
                        </div>
                      </div>
                      <div
                        className="bg-[#e9e5ff] content-stretch flex gap-[4px] items-center px-[10px] py-[4px] relative rounded-[4px] shrink-0"
                        data-node-id="2:13"
                      >
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-node-id="2:14">
                          <div
                            className="flex flex-col justify-center leading-[0] not-italic relative shrink-0 text-[#181445] text-[14px] whitespace-nowrap"
                            data-node-id="2:15"
                          >
                            <p className="leading-[14px]">🔥</p>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0" data-node-id="2:16">
                          <div
                            className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#5300b7] text-[13px] tracking-[0.26px] whitespace-nowrap"
                            data-node-id="2:17"
                          >
                            <p className="leading-[18px]">14 day streak</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative shrink-0 w-full" data-node-id="2:18">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pt-[4px] relative size-full">
                      <div className="content-stretch flex flex-col items-start relative shrink-0" data-node-id="2:19">
                        <div
                          className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] whitespace-nowrap"
                          data-node-id="2:20"
                        >
                          <p className="leading-[18px]">4 of 9 tasks completed</p>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col items-start relative shrink-0" data-node-id="2:21">
                        <div
                          className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#006c49] text-[13px] tracking-[0.26px] whitespace-nowrap"
                          data-node-id="2:22"
                        >
                          <p className="leading-[18px]">44% Flow</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#efebff] h-[8px] relative rounded-[9999px] shrink-0 w-full" data-node-id="2:23">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
                      <div
                        className="absolute bg-gradient-to-r from-[#6d28d9] inset-[0_55.6%_0_0] rounded-[9999px] to-[#006c49] via-1/2 via-[#7331df]"
                        data-node-id="2:24"
                      />
                    </div>
                  </div>
                  <div className="relative shrink-0 w-full" data-node-id="2:25">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[4px] items-center pt-[4px] relative size-full">
                      <div className="relative shrink-0 size-[12.5px]" data-node-id="2:26">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/cfad0.svg" />
                      </div>
                      <div
                        className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] whitespace-nowrap"
                        data-node-id="2:28"
                      >
                        <p className="leading-[18px]">Gentle, focused cadence. 5 tasks left for today.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Carousel / Horizontal Scroll */}
                <div
                  className="h-[34px] relative shrink-0 w-full"
                  data-node-id="2:29"
                  data-name="Filter Carousel / Horizontal Scroll:margin"
                >
                  <div
                    className="absolute content-stretch flex gap-[4px] items-center left-[-16px] overflow-auto no-scrollbar px-[16px] py-[2px] right-[-16px] top-0"
                    data-node-id="2:30"
                  >
                    <button
                      onClick={() => setTaskFilter('all')}
                      className={`${
                        taskFilter === 'all' ? 'bg-[#5300b7] text-white' : 'bg-[#f6f2ff] text-[#4a4455]'
                      } content-stretch drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex gap-[6px] items-center px-[14px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer`}
                      data-node-id="2:31"
                    >
                      <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="2:32">
                        <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[13px] text-center tracking-[0.26px] whitespace-nowrap">
                          <p className="leading-[18px]">All</p>
                        </div>
                      </div>
                      <div
                        className={`${
                          taskFilter === 'all' ? 'bg-[rgba(255,255,255,0.2)] text-white' : 'bg-[#e9e5ff] text-[#5300b7]'
                        } content-stretch flex flex-col items-center px-[6px] relative rounded-[4px] shrink-0`}
                        data-node-id="2:34"
                      >
                        <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[11px] text-center tracking-[0.44px] whitespace-nowrap">
                          <p className="leading-[16px]">9</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setTaskFilter('completed')}
                      className={`${
                        taskFilter === 'completed' ? 'bg-[#5300b7] text-white' : 'bg-[#f6f2ff] text-[#4a4455]'
                      } content-stretch flex flex-col items-center justify-center px-[14px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer`}
                      data-node-id="2:36"
                    >
                      <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[13px] text-center tracking-[0.26px] whitespace-nowrap">
                        <p className="leading-[18px]">Completed</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setTaskFilter('due-soon')}
                      className={`${
                        taskFilter === 'due-soon' ? 'bg-[#5300b7] text-white' : 'bg-[#f6f2ff] text-[#4a4455]'
                      } content-stretch flex gap-[3.99px] items-center px-[14px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer`}
                      data-node-id="2:38"
                    >
                      <div className="relative shrink-0 size-[11.667px]" data-node-id="2:39">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/fd1e7.svg" />
                      </div>
                      <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[13px] text-center tracking-[0.26px] whitespace-nowrap">
                        <p className="leading-[18px]">Due Soon</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Task Stream */}
                <div
                  className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full"
                  data-node-id="2:42"
                  data-name="Task Stream"
                >
                  {filteredTasks.map((task, idx) => {
                    const pct =
                      task.totalCount > 0
                        ? Math.round((task.completedCount / task.totalCount) * 100)
                        : 0;
                    const isFirstStyle = idx === 0 && !task.expanded;

                    return (
                      <div
                        key={task.id}
                        className={`bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch flex flex-col ${
                          isFirstStyle ? 'gap-[8px] pb-[41px] pt-[25px] px-[25px]' : 'p-[25px]'
                        } items-start relative rounded-[6px] shrink-0 w-full transition-all`}
                      >
                        <div className="absolute bg-[rgba(255,255,255,0)] inset-[-1px] rounded-[6px] shadow-[0px_4px_24px_-2px_rgba(109,40,217,0.06),0px_2px_8px_-1px_rgba(24,20,69,0.02)] pointer-events-none" />

                        {isFirstStyle ? (
                          <>
                            <div className="relative shrink-0 w-full">
                              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative size-full">
                                <div className="content-stretch flex flex-col items-start relative shrink-0">
                                  <div className="content-stretch flex flex-col items-start pb-[4px] relative shrink-0 w-full">
                                    <div className="content-stretch flex items-center relative shrink-0 w-full">
                                      <div className="content-stretch flex gap-[2px] items-center relative shrink-0">
                                        <div className="h-[10.833px] relative shrink-0 w-[9.75px]">
                                          <img
                                            alt=""
                                            className="absolute block inset-0 max-w-none size-full"
                                            src="/assets/6c169.svg"
                                          />
                                        </div>
                                        <div className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] whitespace-nowrap">
                                          <p className="leading-[18px]">{task.dueDate}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full">
                                    <div className="flex flex-col font-['Manrope:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#181445] text-[20px] tracking-[-0.5px] whitespace-nowrap">
                                      <p className="leading-[28px]">{task.title}</p>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleTaskExpand(task.id)}
                                  className="bg-[#f6f2ff] content-stretch flex items-center justify-center relative rounded-[9999px] shrink-0 size-[32px] cursor-pointer hover:bg-[#ebddff]"
                                  aria-label="Toggle details"
                                >
                                  <div className="h-[6.167px] relative shrink-0 w-[10px]">
                                    <img
                                      alt=""
                                      className="absolute block inset-0 max-w-none size-full"
                                      src="/assets/3af45.svg"
                                    />
                                  </div>
                                </button>
                              </div>
                            </div>
                            <div className="relative shrink-0 w-full">
                              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[6px] items-start relative size-full">
                                <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                                  <div className="content-stretch flex flex-col items-start relative shrink-0">
                                    <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[13px] tracking-[0.26px] whitespace-nowrap">
                                      <p className="leading-[18px]">
                                        {task.completedCount} of {task.totalCount} subtasks completed
                                      </p>
                                    </div>
                                  </div>
                                  <div className="content-stretch flex flex-col items-start relative shrink-0">
                                    <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#5300b7] text-[13px] tracking-[0.26px] whitespace-nowrap">
                                      <p className="leading-[18px]">{pct}%</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-[#efebff] h-[6px] overflow-clip relative rounded-[9999px] shrink-0 w-full">
                                  <div
                                    className="absolute bg-gradient-to-r from-[#6d28d9] inset-y-0 left-0 rounded-[9999px] to-[#006c49]"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="relative shrink-0 w-full">
                              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-start relative size-full">
                                <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative">
                                  <div className="content-stretch flex flex-col items-start pb-[4px] relative shrink-0 w-full">
                                    <div className="content-stretch flex items-center relative shrink-0 w-full">
                                      <div className="content-stretch flex gap-[2px] items-center relative shrink-0">
                                        <div className="h-[10.833px] relative shrink-0 w-[9.75px]">
                                          <img
                                            alt=""
                                            className="absolute block inset-0 max-w-none size-full"
                                            src="/assets/6c169.svg"
                                          />
                                        </div>
                                        <div className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] whitespace-nowrap">
                                          <p className="leading-[18px]">{task.dueDate}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full">
                                    <div className="flex flex-col font-['Manrope:SemiBold'] font-semibold justify-center leading-[0] overflow-hidden relative shrink-0 text-[#181445] text-[20px] text-ellipsis tracking-[-0.5px] w-full">
                                      <p className="leading-[28px]">{task.title}</p>
                                    </div>
                                  </div>
                                  <div className="content-stretch flex flex-col items-start pt-[8px] relative shrink-0 w-full">
                                    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full">
                                      <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                                        <div className="content-stretch flex flex-col items-start relative shrink-0">
                                          <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[13px] tracking-[0.26px] whitespace-nowrap">
                                            <p className="leading-[18px]">
                                              {task.completedCount} of {task.totalCount} completed
                                            </p>
                                          </div>
                                        </div>
                                        <div className="content-stretch flex flex-col items-start relative shrink-0">
                                          <div
                                            className={`flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 ${
                                              pct > 0 ? 'text-[#5300b7]' : 'text-[#4a4455]'
                                            } text-[13px] tracking-[0.26px] whitespace-nowrap`}
                                          >
                                            <p className="leading-[18px]">{pct}%</p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="bg-[#efebff] h-[6px] overflow-clip relative rounded-[9999px] shrink-0 w-full">
                                        {pct > 0 && (
                                          <div
                                            className="absolute bg-[#6d28d9] inset-y-0 left-0 rounded-[9999px] transition-all"
                                            style={{ width: `${pct}%` }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="content-stretch flex flex-col h-[32px] items-start pl-[8px] relative shrink-0 w-[40px]">
                                  <button
                                    onClick={() => toggleTaskExpand(task.id)}
                                    className="bg-[#f6f2ff] content-stretch flex items-center justify-center relative rounded-[9999px] shrink-0 size-[32px] cursor-pointer hover:bg-[#ebddff]"
                                    aria-label="Toggle details"
                                  >
                                    <div className="flex items-center justify-center relative shrink-0">
                                      <div className={task.expanded ? 'flex-none rotate-180' : 'flex-none'}>
                                        <div className="h-[6.167px] relative w-[10px]">
                                          <img
                                            alt=""
                                            className="absolute block inset-0 max-w-none size-full"
                                            src="/assets/3751a.svg"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {task.expanded && task.subtasks.length > 0 && (
                              <div className="relative shrink-0 w-full">
                                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start pt-[16px] relative size-full">
                                  {task.subtasks.map((sub) => (
                                    <div
                                      key={sub.id}
                                      onClick={() => toggleSubtaskDone(task.id, sub.id)}
                                      className={`${
                                        sub.done ? 'bg-[rgba(246,242,255,0.7)]' : 'bg-[#f6f2ff]'
                                      } content-stretch flex gap-[12px] items-start p-[12px] relative rounded-[5px] shrink-0 w-full cursor-pointer hover:opacity-95`}
                                    >
                                      <div className="content-stretch flex flex-[1_0_0] gap-[12px] items-start min-w-px relative">
                                        <div className="content-stretch flex flex-col h-[22px] items-start pt-[2px] relative shrink-0 w-[20px]">
                                          <div
                                            className={`${
                                              sub.done ? 'bg-[#006c49]' : 'bg-[#e9e5ff]'
                                            } content-stretch flex items-center justify-center relative rounded-[9999px] shrink-0 size-[20px]`}
                                          >
                                            <div className="h-[7.015px] relative shrink-0 w-[9.508px]">
                                              <img
                                                alt=""
                                                className="absolute block inset-0 max-w-none size-full"
                                                src={sub.done ? '/assets/3ad68.svg' : '/assets/4167b.svg'}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                        <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative">
                                          <div
                                            className={`flex flex-col ${
                                              sub.done
                                                ? "font-['Hanken_Grotesk:Regular'] font-normal text-[#4a4455]"
                                                : "font-['Hanken_Grotesk:Medium'] font-medium text-[#181445]"
                                            } justify-center leading-[0] relative shrink-0 text-[14px] w-full`}
                                          >
                                            <p
                                              className={`leading-[22px] whitespace-pre-line ${
                                                sub.done ? 'line-through' : ''
                                              }`}
                                            >
                                              {sub.title}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="content-stretch flex flex-col items-start pt-[2px] relative shrink-0">
                                        {sub.done ? (
                                          <div className="bg-[#6cf8bb] content-stretch flex flex-col items-start px-[8px] py-[2px] relative rounded-[4px] shrink-0">
                                            <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#00714d] text-[11px] tracking-[0.44px] whitespace-nowrap">
                                              <p className="leading-[16px]">Done</p>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="bg-[#ffdad6] content-stretch flex flex-col items-start px-[8px] py-[2px] relative rounded-[4px] shrink-0">
                                            <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#93000a] text-[11px] tracking-[0.44px] whitespace-nowrap">
                                              <p className="leading-[16px]">Due</p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Header (node 2:172) */}
            <div
              className="absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.85)] content-stretch flex flex-col items-start left-0 shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] top-0 w-full z-20"
              data-node-id="2:172"
              data-name="Header"
            >
              <div className="content-stretch flex items-center justify-between pt-[4px] px-[16px] relative shrink-0 w-full">
                <div className="content-stretch flex flex-col items-start relative shrink-0">
                  <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#181445] text-[13px] tracking-[0.26px] whitespace-nowrap">
                    <p className="leading-[18px]">9:41</p>
                  </div>
                </div>
                <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
                  <div className="relative shrink-0 size-[13.333px]">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/94dbb.svg" />
                  </div>
                  <div className="h-[11.333px] relative shrink-0 w-[16px]">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/1c973.svg" />
                  </div>
                  <div className="h-[15px] relative shrink-0 w-[7.5px]">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/9bfac.svg" />
                  </div>
                </div>
              </div>
              <div className="content-stretch flex h-[64px] items-center justify-between px-[16px] relative shrink-0 w-full">
                <div
                  onClick={() => setActiveScreen('tasks')}
                  className="h-[32px] max-w-[132.13px] relative shrink-0 w-[132.13px] cursor-pointer"
                  data-node-id="2:184"
                  data-name="Taskora Logo"
                >
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img alt="Taskora" className="absolute left-0 max-w-none size-full top-0" src="/assets/4da2d.png" />
                  </div>
                </div>
                <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
                  <button
                    onClick={() => setShowSearch((prev) => !prev)}
                    className="content-stretch flex items-center justify-center relative rounded-[9999px] shrink-0 size-[44px] cursor-pointer hover:bg-[#efebff]/60"
                    data-node-id="2:186"
                    aria-label="Search"
                  >
                    <div className="relative shrink-0 size-[16.5px]">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/0ef90.svg" />
                    </div>
                  </button>
                  <div
                    onClick={() => setActiveScreen('profile')}
                    className="content-stretch flex flex-col items-start pl-[4px] relative shrink-0 cursor-pointer"
                  >
                    <div className="content-stretch flex flex-col items-start relative shrink-0">
                      <div className="max-w-[32px] relative rounded-[9999px] shadow-[0px_2px_8px_0px_rgba(109,40,217,0.12)] shrink-0 size-[32px]">
                        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[9999px]">
                          <img alt="Profile" className="absolute left-0 max-w-none size-full top-0" src="/assets/b5198.png" />
                        </div>
                      </div>
                      <div className="absolute bg-[#006c49] bottom-0 content-stretch flex flex-col items-end justify-end right-0 rounded-[9999px] size-[10px]">
                        <div className="bg-[rgba(255,255,255,0)] relative rounded-[9999px] shadow-[0px_0px_0px_2px_#fcf8ff] shrink-0 size-[10px]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Create Task Button (node 2:194) */}
            <button
              onClick={() => setActiveScreen('create-task')}
              className="fixed sm:absolute bottom-[80px] content-stretch cursor-pointer flex flex-col items-start right-[16px] z-20"
              data-node-id="2:194"
              aria-label="Create Task"
            >
              <div className="bg-[#6d28d9] content-stretch flex items-center justify-center relative rounded-[9999px] shrink-0 size-[56px] hover:scale-105 transition-transform">
                <div className="absolute bg-[rgba(255,255,255,0)] left-0 rounded-[9999px] shadow-[0px_16px_40px_-6px_rgba(109,40,217,0.32),0px_6px_16px_-2px_rgba(109,40,217,0.2)] size-[56px] top-0" />
                <div className="relative shrink-0 size-[16.333px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/de4cd.svg" />
                </div>
              </div>
            </button>

            {/* Bottom Nav (node 2:199) */}
            <div
              className="fixed sm:absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.9)] bottom-0 content-stretch flex flex-col items-start left-0 shadow-[0px_-2px_12px_0px_rgba(109,40,217,0.04)] w-full z-20"
              data-node-id="2:199"
              data-name="Nav"
            >
              <div className="content-stretch flex h-[64px] items-center justify-around px-[16px] relative shrink-0 w-full">
                <button
                  onClick={() => setActiveScreen('tasks')}
                  className="content-stretch flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] px-[12.97px] py-px relative shrink-0 cursor-pointer"
                >
                  <div className="h-[13.819px] relative shrink-0 w-[18.333px]">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/962dc.svg" />
                  </div>
                  <div className="content-stretch flex flex-col items-start relative shrink-0">
                    <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#5300b7] text-[11px] tracking-[0.44px] whitespace-nowrap">
                      <p className="leading-[16px]">Tasks</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveScreen('leaderboard')}
                  className="content-stretch cursor-pointer flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] px-[11.89px] py-px relative shrink-0"
                >
                  <div className="relative shrink-0 size-[16.5px]">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/ff568.svg" />
                  </div>
                  <div className="content-stretch flex flex-col items-start relative shrink-0">
                    <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[11px] text-left tracking-[0.44px] whitespace-nowrap">
                      <p className="leading-[16px]">Ranks</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveScreen('profile')}
                  className="content-stretch flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] px-[10.47px] py-px relative shrink-0 cursor-pointer"
                >
                  <div className="relative shrink-0 size-[18.333px]">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/a3394.svg" />
                  </div>
                  <div className="content-stretch flex flex-col items-start relative shrink-0">
                    <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[11px] tracking-[0.44px] whitespace-nowrap">
                      <p className="leading-[16px]">Profile</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 2: User Profile - Productivity & Achievements (node 2:216)
           ===================================================================== */}
        {activeScreen === 'profile' && (
          <div
            className="bg-[#fcf8ff] content-stretch flex flex-col items-start relative w-full"
            data-node-id="2:216"
            data-name="User Profile - Productivity & Achievements"
          >
            <div
              className="bg-[#fcf8ff] content-stretch flex flex-col items-start min-h-[780px] pb-[112px] pt-[96px] relative shrink-0 w-full"
              data-node-id="2:217"
            >
              <div className="content-stretch flex flex-col items-start px-[16px] relative shrink-0 w-full">
                {/* Profile Header Card */}
                <div
                  className="bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch flex flex-col items-start overflow-clip p-[25px] relative rounded-[6px] shadow-[0px_8px_20px_-4px_rgba(109,40,217,0.12)] shrink-0 w-full"
                  data-node-id="2:219"
                >
                  <div className="h-[370.25px] relative shrink-0 w-full">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
                      <div className="-translate-x-1/2 -translate-y-1/2 absolute flex flex-col font-['Manrope:SemiBold'] font-semibold justify-center leading-[0] left-1/2 text-[#181445] text-[24px] text-center top-[128px] tracking-[-0.36px] whitespace-nowrap">
                        <p className="leading-[32px]">{profileName}</p>
                      </div>
                      <div className="absolute content-stretch flex flex-col items-start left-1/2 -translate-x-1/2 pt-[6px] top-[144px]">
                        <div className="bg-[#ebddff] content-stretch flex gap-[4px] items-center px-[10px] py-[2px] relative rounded-[4px] shrink-0">
                          <div className="h-[7px] relative shrink-0 w-[11.667px]">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/50cbf.svg" />
                          </div>
                          <div className="content-stretch flex flex-col items-center relative shrink-0">
                            <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#250059] text-[11px] text-center tracking-[0.44px] whitespace-nowrap">
                              <p className="leading-[16px]">{profileRole}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute content-stretch flex flex-col items-center left-0 right-0 pt-[7.25px] top-[170px]">
                        <div className="content-stretch flex flex-col items-center max-w-[320px] px-[6px] relative shrink-0">
                          <div className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[22.75px] relative shrink-0 text-[#4a4455] text-[14px] text-center">
                            <p>{profileBio}</p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute content-stretch flex flex-col items-center left-0 right-0 pt-[12px] top-[246.25px]">
                        <div className="content-stretch flex flex-col gap-[8px] items-center justify-center relative shrink-0">
                          <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
                            <div className="h-[13.333px] relative shrink-0 w-[10.667px]">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/5d8e3.svg" />
                            </div>
                            <div className="content-stretch flex flex-col items-center relative shrink-0">
                              <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[13px] text-center tracking-[0.26px] whitespace-nowrap">
                                <p className="leading-[18px]">{profileLocation}</p>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
                            <div className="h-[10.667px] relative shrink-0 w-[13.333px]">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/69050.svg" />
                            </div>
                            <div className="content-stretch flex flex-col items-center relative shrink-0">
                              <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[13px] text-center tracking-[0.26px] whitespace-nowrap">
                                <p className="leading-[18px]">{profileEmail}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute content-stretch flex flex-col items-start left-[106px] pb-[16px] top-0">
                        <div className="bg-[#e9e5ff] content-stretch flex flex-col items-start justify-center p-[4px] relative rounded-[9999px] shrink-0 size-[96px]">
                          <div className="absolute bg-[rgba(255,255,255,0)] left-0 rounded-[9999px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] size-[96px] top-0" />
                          <div className="flex-[1_0_0] min-h-px relative rounded-[9999px] w-full">
                            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[9999px]">
                              <img
                                alt="Alex Morgan"
                                className="absolute left-0 max-w-none size-full top-0"
                                src="/assets/b5198.png"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute content-stretch flex flex-col items-start left-0 max-w-[320px] pt-[24px] right-0 top-[302.25px]">
                        <div className="content-stretch flex items-center justify-center max-w-[320px] relative shrink-0 w-full">
                          <button
                            onClick={() => setEditingProfile(true)}
                            className="bg-[#6d28d9] content-stretch flex flex-[1_0_0] gap-[6px] h-[44px] items-center justify-center min-w-px px-[16px] relative rounded-[6px] cursor-pointer hover:bg-[#5b21b6]"
                          >
                            <div className="-translate-y-1/2 absolute bg-[rgba(255,255,255,0)] h-[44px] left-0 right-0 rounded-[6px] shadow-[0px_8px_20px_-4px_rgba(109,40,217,0.3)] top-1/2" />
                            <div className="relative shrink-0 size-[13.5px]">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/49219.svg" />
                            </div>
                            <div className="content-stretch flex flex-col items-center relative shrink-0">
                              <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[13px] text-center text-white tracking-[0.26px] whitespace-nowrap">
                                <p className="leading-[18px]">Edit Profile</p>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global Standing Card */}
                <div className="content-stretch flex flex-col items-start pt-[24px] relative shrink-0 w-full">
                  <div className="bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch flex flex-col gap-[16px] items-start p-[25px] relative rounded-[6px] shrink-0 w-full">
                    <div className="absolute bg-[rgba(255,255,255,0)] inset-[-1px] rounded-[6px] shadow-[0px_8px_20px_-4px_rgba(109,40,217,0.12)] pointer-events-none" />
                    <div className="relative shrink-0 w-full">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between relative size-full">
                        <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
                          <div className="bg-[rgba(108,248,187,0.3)] content-stretch flex items-center justify-center relative rounded-[6px] shrink-0 size-[48px]">
                            <div className="h-[21.667px] relative shrink-0 w-[10.833px]">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/9dfcd.svg" />
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col items-start relative shrink-0">
                            <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
                              <div className="content-stretch flex flex-col items-start relative shrink-0">
                                <div className="flex flex-col font-['Manrope:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#181445] text-[20px] tracking-[-0.3px] whitespace-nowrap">
                                  <p className="leading-[28px]">Rank #4</p>
                                </div>
                              </div>
                              <div className="bg-[rgba(108,248,187,0.4)] content-stretch flex flex-col items-start px-[8px] py-[2px] relative rounded-[4px] shrink-0">
                                <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#00714d] text-[11px] tracking-[0.44px] whitespace-nowrap">
                                  <p className="leading-[16px]">Available</p>
                                </div>
                              </div>
                            </div>
                            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
                              <div className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] whitespace-nowrap">
                                <p className="leading-[18px]">SF Bay Area Leaderboard</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
                          <div className="h-[9px] relative shrink-0 w-[15px]">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/82b4a.svg" />
                          </div>
                          <div className="content-stretch flex flex-col items-start relative shrink-0">
                            <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#006c49] text-[13px] tracking-[0.26px] whitespace-nowrap">
                              <p className="leading-[18px]">+2 ranks</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-[#efebff] border-solid border-t relative shrink-0 w-full">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center pt-[13px] relative size-full">
                        <button
                          onClick={() => showToast('Hire request sent to Alex Morgan!')}
                          className="bg-[#5300b7] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex-[1_0_0] h-[44px] min-w-px relative rounded-[6px] cursor-pointer hover:bg-[#430096]"
                        >
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[6px] items-center justify-center relative size-full">
                            <div className="h-[14.25px] relative shrink-0 w-[15px]">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/ec69c.svg" />
                            </div>
                            <div className="content-stretch flex flex-col items-center relative shrink-0">
                              <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[13px] text-center text-white tracking-[0.26px] whitespace-nowrap">
                                <p className="leading-[18px]">Hire</p>
                              </div>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => showToast('Profile card link copied to clipboard!')}
                          className="bg-[#e9e5ff] flex-[1_0_0] h-[44px] min-w-px relative rounded-[6px] cursor-pointer hover:bg-[#dcd5ff]"
                        >
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[6px] items-center justify-center relative size-full">
                            <div className="h-[15px] relative shrink-0 w-[13.5px]">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src="/assets/ce6da.svg" />
                            </div>
                            <div className="content-stretch flex flex-col items-center relative shrink-0">
                              <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#181445] text-[13px] text-center tracking-[0.26px] whitespace-nowrap">
                                <p className="leading-[18px]">Share Card</p>
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Performance (4 Metric Cards Grid) */}
                <div className="content-stretch flex flex-col items-start pt-[24px] relative shrink-0 w-full">
                  <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
                    <div className="content-stretch flex items-center justify-between px-[4px] relative shrink-0 w-full">
                      <div className="content-stretch flex flex-col items-start relative shrink-0">
                        <div className="flex flex-col font-['Manrope:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#181445] text-[20px] tracking-[-0.3px] whitespace-nowrap">
                          <p className="leading-[28px]">Monthly Performance</p>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col items-start relative shrink-0">
                        <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[11px] tracking-[0.44px] whitespace-nowrap">
                          <p className="leading-[16px]">November 2024</p>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col items-start pt-[8px] relative shrink-0 w-full">
                      <div className="gap-x-[8px] gap-y-[8px] grid grid-cols-2 relative shrink-0 w-full">
                        {/* Card 1 */}
                        <div className="bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch drop-shadow-[0px_2px_6px_rgba(109,40,217,0.03)] flex flex-col items-start justify-between p-[17px] relative rounded-[6px] h-[122px]">
                          <div className="relative shrink-0 w-full">
                            <div className="h-[18.333px] relative w-[18.333px]">
                              <img alt="" className="block size-full" src="/assets/6de53.svg" />
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col gap-[0.5px] items-start pt-[16px] relative shrink-0 w-full">
                            <div className="flex flex-col font-['Manrope:Bold'] font-bold justify-center leading-[0] relative shrink-0 text-[#181445] text-[24px] tracking-[-0.36px] whitespace-nowrap">
                              <p className="leading-[32px]">38</p>
                            </div>
                            <div className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] w-full">
                              <p className="leading-[18px]">Tasks Completed</p>
                            </div>
                          </div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch drop-shadow-[0px_2px_6px_rgba(109,40,217,0.03)] flex flex-col items-start justify-between p-[17px] relative rounded-[6px] h-[122px]">
                          <div className="relative shrink-0 w-full">
                            <div className="h-[18.333px] relative w-[18.333px]">
                              <img alt="" className="block size-full" src="/assets/69226.svg" />
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col gap-[0.5px] items-start pt-[16px] relative shrink-0 w-full">
                            <div className="flex flex-col font-['Manrope:Bold'] font-bold justify-center leading-[0] relative shrink-0 text-[#181445] text-[24px] tracking-[-0.36px] whitespace-nowrap">
                              <p className="leading-[32px]">94%</p>
                            </div>
                            <div className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] w-full">
                              <p className="leading-[18px]">Completion Rate</p>
                            </div>
                          </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch drop-shadow-[0px_2px_6px_rgba(109,40,217,0.03)] flex flex-col items-start justify-between p-[17px] relative rounded-[6px] h-[122px]">
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                            <div className="h-[17.417px] relative shrink-0 w-[14.667px]">
                              <img alt="" className="block size-full" src="/assets/eb5b6.svg" />
                            </div>
                            <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[11px] tracking-[0.44px] whitespace-nowrap">
                              <p className="leading-[16px]">Daily</p>
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col gap-[0.5px] items-start pt-[16px] relative shrink-0 w-full">
                            <div className="flex flex-col font-['Manrope:Bold'] font-bold justify-center leading-[0] relative shrink-0 text-[#181445] text-[24px] tracking-[-0.36px] whitespace-nowrap">
                              <p className="leading-[32px]">14 days</p>
                            </div>
                            <div className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] w-full">
                              <p className="leading-[18px]">Current Streak</p>
                            </div>
                          </div>
                        </div>

                        {/* Card 4 */}
                        <div className="bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch drop-shadow-[0px_2px_6px_rgba(109,40,217,0.03)] flex flex-col items-start justify-between p-[17px] relative rounded-[6px] h-[122px]">
                          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                            <div className="h-[18.333px] relative shrink-0 w-[16.5px]">
                              <img alt="" className="block size-full" src="/assets/9ba65.svg" />
                            </div>
                            <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#006c49] text-[11px] tracking-[0.44px] whitespace-nowrap">
                              <p className="leading-[16px]">26/30</p>
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col gap-[0.5px] items-start pt-[16px] relative shrink-0 w-full">
                            <div className="flex flex-col font-['Manrope:Bold'] font-bold justify-center leading-[0] relative shrink-0 text-[#181445] text-[24px] tracking-[-0.36px] whitespace-nowrap">
                              <p className="leading-[32px]">26 days</p>
                            </div>
                            <div className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] w-full">
                              <p className="leading-[18px]">Productive Days</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consistency Grid */}
                <div className="content-stretch flex flex-col items-start pt-[24px] relative shrink-0 w-full">
                  <div className="bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch flex flex-col gap-[16px] items-start p-[25px] relative rounded-[6px] shrink-0 w-full">
                    <div className="absolute bg-[rgba(255,255,255,0)] inset-[-1px] rounded-[6px] shadow-[0px_4px_20px_-2px_rgba(109,40,217,0.04)] pointer-events-none" />
                    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                      <div className="content-stretch flex flex-col items-start relative shrink-0">
                        <div className="flex flex-col font-['Manrope:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#181445] text-[16px] tracking-[-0.16px] whitespace-nowrap">
                          <p className="leading-[24px]">Consistency Grid</p>
                        </div>
                        <div className="flex flex-col font-['Hanken_Grotesk:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[#4a4455] text-[12px] tracking-[0.12px] whitespace-nowrap">
                          <p className="leading-[18px]">November habit & task activity</p>
                        </div>
                      </div>
                      <div className="bg-[rgba(108,248,187,0.4)] content-stretch flex flex-col items-start px-[8px] py-[2px] relative rounded-[4px] shrink-0">
                        <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#00714d] text-[11px] tracking-[0.44px] whitespace-nowrap">
                          <p className="leading-[16px]">{completedDays.length + 2} Completed</p>
                        </div>
                      </div>
                    </div>

                    <div className="gap-[6px] grid grid-cols-7 relative shrink-0 w-full">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                        <div key={i} className="flex flex-col items-center py-[4px]">
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
                            {d}
                          </span>
                        </div>
                      ))}
                      {/* 4 empty cells before Nov 1 (Friday) */}
                      {[0, 1, 2, 3].map((emptyIdx) => (
                        <div key={`empty-${emptyIdx}`} className="bg-[#f6f2ff] h-[32px] rounded-[4px]" />
                      ))}
                      {/* Days 1..30 */}
                      {Array.from({ length: 30 }, (_, idx) => idx + 1).map((day) => {
                        const isToday = day === 14;
                        const isCompleted = completedDays.includes(day);
                        const isPastIncomplete = day === 3 || day === 10;
                        return (
                          <button
                            key={day}
                            onClick={() => toggleCalendarDay(day)}
                            className={`h-[32px] rounded-[4px] flex items-center justify-center relative cursor-pointer transition-colors ${
                              isToday
                                ? 'bg-[#5300b7] text-white font-["Hanken_Grotesk:Bold"] shadow-[0px_0px_0px_2px_#ebddff,0px_4px_6px_-1px_rgba(0,0,0,0.1)]'
                                : isCompleted
                                ? 'bg-[#006c49] text-white font-["Hanken_Grotesk:SemiBold"]'
                                : isPastIncomplete
                                ? 'bg-[#efebff] text-[#4a4455] font-["Hanken_Grotesk:SemiBold"]'
                                : 'bg-[#f6f2ff] text-[rgba(74,68,85,0.6)] font-["Hanken_Grotesk:SemiBold"]'
                            } text-[11px] tracking-[0.44px]`}
                          >
                            {day}
                          </button>
                        );
                      })}
                      {/* Trailing empty cell */}
                      <div className="bg-[#f6f2ff] h-[32px] rounded-[4px]" />
                    </div>

                    <div className="border-[#efebff] border-solid border-t pt-[17px] flex items-center justify-between w-full">
                      <div className="flex gap-[6px] items-center">
                        <div className="bg-[#006c49] rounded-[4px] size-[12px]" />
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
                          Completed
                        </span>
                      </div>
                      <div className="flex gap-[6px] items-center">
                        <div className="bg-[#efebff] border border-[rgba(204,195,215,0.3)] rounded-[4px] size-[12px]" />
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
                          Incomplete
                        </span>
                      </div>
                      <div className="flex gap-[6px] items-center">
                        <div className="bg-[#5300b7] rounded-[4px] size-[12px] shadow-[0px_0px_0px_2px_#ebddff]" />
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
                          Today
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.85)] content-stretch flex flex-col items-start left-0 shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] top-0 w-full z-20">
              <div className="content-stretch flex items-center justify-between pt-[4px] px-[16px] relative shrink-0 w-full">
                <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] tracking-[0.26px]">
                  <p className="leading-[18px]">9:41</p>
                </div>
                <div className="flex gap-[4px] items-center">
                  <div className="relative size-[13.333px]">
                    <img alt="" className="block size-full" src="/assets/94dbb.svg" />
                  </div>
                  <div className="h-[11.333px] relative w-[16px]">
                    <img alt="" className="block size-full" src="/assets/1c973.svg" />
                  </div>
                  <div className="h-[15px] relative w-[7.5px]">
                    <img alt="" className="block size-full" src="/assets/9bfac.svg" />
                  </div>
                </div>
              </div>
              <div className="content-stretch flex h-[64px] items-center justify-between px-[16px] relative shrink-0 w-full">
                <div
                  onClick={() => setActiveScreen('tasks')}
                  className="h-[32px] relative shrink-0 w-[132.13px] cursor-pointer"
                >
                  <img alt="Taskora" className="size-full object-contain" src="/assets/4da2d.png" />
                </div>
                <div className="flex gap-[4px] items-center">
                  <button
                    onClick={() => {
                      setActiveScreen('tasks');
                      setShowSearch(true);
                    }}
                    className="flex items-center justify-center rounded-full size-[44px] cursor-pointer"
                  >
                    <div className="relative size-[16.5px]">
                      <img alt="" className="block size-full" src="/assets/0ef90.svg" />
                    </div>
                  </button>
                  <div className="pl-[4px] relative">
                    <div className="relative rounded-full shadow-[0px_2px_8px_0px_rgba(109,40,217,0.12)] size-[32px] overflow-hidden">
                      <img alt="Profile" className="size-full object-cover" src="/assets/b5198.png" />
                    </div>
                    <div className="absolute bg-[#006c49] bottom-0 right-0 rounded-full size-[10px] shadow-[0px_0px_0px_2px_#fcf8ff]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating + Button */}
            <button
              onClick={() => setActiveScreen('create-task')}
              className="fixed sm:absolute bottom-[80px] right-[16px] z-20 cursor-pointer"
            >
              <div className="bg-[#6d28d9] flex items-center justify-center relative rounded-full size-[56px] shadow-[0px_16px_40px_-6px_rgba(109,40,217,0.32),0px_6px_16px_-2px_rgba(109,40,217,0.2)]">
                <div className="relative size-[16.333px]">
                  <img alt="" className="block size-full" src="/assets/de4cd.svg" />
                </div>
              </div>
            </button>

            {/* Bottom Nav */}
            <div className="fixed sm:absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.9)] bottom-0 left-0 shadow-[0px_-2px_12px_0px_rgba(109,40,217,0.04)] w-full z-20">
              <div className="flex h-[64px] items-center justify-around px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('tasks')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <div className="h-[13.819px] relative w-[18.333px]">
                    <img alt="" className="block size-full" src="/assets/0b680.svg" />
                  </div>
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px] tracking-[0.44px]">
                    Tasks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('leaderboard')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <div className="relative size-[16.5px]">
                    <img alt="" className="block size-full" src="/assets/ff568.svg" />
                  </div>
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px] tracking-[0.44px]">
                    Ranks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('profile')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <div className="relative size-[18.333px]">
                    <img alt="" className="block size-full" src="/assets/78c98.svg" />
                  </div>
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px] leading-[16px] tracking-[0.44px]">
                    Profile
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 3: Leaderboard - Location Filtered Rankings (node 2:486)
           ===================================================================== */}
        {activeScreen === 'leaderboard' && (
          <div
            className="bg-[#fcf8ff] content-stretch flex flex-col items-start relative w-full"
            data-node-id="2:486"
            data-name="Leaderboard - Location Filtered Rankings"
          >
            <div className="bg-[#fcf8ff] content-stretch flex flex-col items-start min-h-[780px] pb-[112px] pt-[96px] relative shrink-0 w-full">
              <div className="h-[1214px] relative shrink-0 w-full">
                {/* Header & Description */}
                <div className="absolute content-stretch flex flex-col items-start left-[16px] pt-[4px] right-[16px] top-0">
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                    <div className="flex flex-col font-['Manrope:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#181445] text-[24px] tracking-[-0.6px] whitespace-nowrap">
                      <p className="leading-[32px]">Monthly Leaderboard</p>
                    </div>
                    <button
                      onClick={() =>
                        setSelectedPeriod((p) => (p === 'Nov 2026' ? 'Oct 2026' : 'Nov 2026'))
                      }
                      className="bg-[#efebff] border border-[rgba(204,195,215,0.3)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex gap-[3.99px] items-center px-[13px] py-[7px] relative rounded-[6px] shrink-0 cursor-pointer"
                    >
                      <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#5300b7] text-[13px] text-center tracking-[0.26px] whitespace-nowrap">
                        <p className="leading-[18px]">{selectedPeriod}</p>
                      </div>
                      <div className="h-[5.55px] relative shrink-0 w-[9px]">
                        <img alt="" className="block size-full" src="/assets/f0a47.svg" />
                      </div>
                    </button>
                  </div>
                  <div className="content-stretch flex flex-col items-start pt-[10px] relative shrink-0 w-full">
                    <div className="content-stretch flex gap-[6px] items-center relative shrink-0 w-full">
                      <div className="h-[13.333px] relative shrink-0 w-[9.333px]">
                        <img alt="" className="block size-full" src="/assets/ac60b.svg" />
                      </div>
                      <div className="flex flex-col font-['Hanken_Grotesk:Medium'] font-medium justify-center leading-[0] relative shrink-0 text-[#5300b7] text-[12px] tracking-[0.12px] whitespace-nowrap">
                        <p className="leading-[18px]">
                          {locationScope === 'sf'
                            ? 'Showing performers in San Francisco, CA'
                            : 'Showing top performers Worldwide'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-col items-start pt-[12px] relative shrink-0 w-full">
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
                      <button
                        onClick={() => setLocationScope('sf')}
                        className="bg-[#ebddff] border border-[rgba(83,0,183,0.2)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-[1_0_0] flex-col items-start min-w-px p-px relative rounded-[6px] cursor-pointer text-left"
                      >
                        <div className="border border-[#6b7280] border-solid relative rounded-[6px] shrink-0 w-full">
                          <div className="content-stretch flex items-center justify-center overflow-clip px-[33px] py-[9px] relative rounded-[inherit] size-full">
                            <div className="-translate-y-1/2 absolute left-[222.23px] size-[19.5px] top-1/2">
                              <img alt="" className="block size-full" src="/assets/f2c5d.svg" />
                            </div>
                            <div className="flex-[1_0_0] min-w-px relative">
                              <div className="flex flex-col font-['Hanken_Grotesk:Bold'] font-bold justify-center leading-[0] relative shrink-0 text-[#250059] text-[13px] tracking-[0.26px] w-full">
                                <p className="leading-[18px]">San Francisco, CA (Default)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute bottom-[calc(27.63%-0.45px)] left-[12px] top-[calc(27.63%-0.45px)]">
                          <div className="h-[14.167px] relative shrink-0 w-[11.333px]">
                            <img alt="" className="block size-full" src="/assets/0b5ae.svg" />
                          </div>
                        </div>
                        <div className="absolute bottom-[calc(26.32%-0.47px)] right-[12.67px] top-[calc(26.32%-0.47px)]">
                          <div className="h-[5.55px] relative shrink-0 w-[9px]">
                            <img alt="" className="block size-full" src="/assets/ffd7c.svg" />
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setLocationScope((s) => (s === 'sf' ? 'global' : 'sf'))}
                        className={`${
                          locationScope === 'global' ? 'bg-[#5300b7] text-white' : 'bg-[#efebff] text-[#4a4455]'
                        } border border-[rgba(204,195,215,0.3)] border-solid content-stretch flex gap-[6px] items-center px-[17px] py-[9px] relative rounded-[6px] shrink-0 cursor-pointer`}
                      >
                        <div className="relative shrink-0 size-[13.333px]">
                          <img alt="" className="block size-full" src="/assets/47366.svg" />
                        </div>
                        <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[13px] text-center tracking-[0.26px] whitespace-nowrap">
                          <p className="leading-[18px]">Global</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sticky Prominent User Status Card */}
                <div className="absolute content-stretch flex flex-col items-start left-[16px] pt-[16px] right-[16px] top-[114px]">
                  <div className="bg-white border border-[rgba(204,195,215,0.3)] border-solid content-stretch flex flex-col gap-[8px] items-start overflow-clip p-[17px] relative rounded-[6px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full">
                    <div className="absolute bg-[rgba(235,221,255,0.2)] blur-[40px] right-[-40px] rounded-[9999px] size-[128px] top-[-40px]" />
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
                      <div className="relative rounded-[9999px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 size-[48px] overflow-hidden">
                        <img alt="Alex Morgan" className="size-full object-cover" src="/assets/b5198.png" />
                      </div>
                      <div className="content-stretch flex flex-col items-start relative shrink-0">
                        <div className="content-center flex flex-wrap gap-[6px] items-center relative shrink-0 w-full">
                          <div className="flex flex-col font-['Manrope:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#181445] text-[16px] tracking-[-0.16px] whitespace-nowrap">
                            <p className="leading-[24px]">{profileName}</p>
                          </div>
                          <div className="bg-[#ebddff] content-stretch flex flex-col items-start px-[8px] py-[2px] relative rounded-[4px] shrink-0">
                            <div className="flex flex-col font-['Hanken_Grotesk:SemiBold'] font-semibold justify-center leading-[0] relative shrink-0 text-[#250059] text-[11px] tracking-[0.44px] whitespace-nowrap">
                              <p className="leading-[16px]">YOU</p>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-full">
                          <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                            {profileRole}
                          </span>
                          <span className="text-[#4a4455] text-[12px] leading-[18px]">•</span>
                          <div className="flex gap-[2px] items-center">
                            <div className="h-[10.833px] relative w-[8.667px]">
                              <img alt="" className="block size-full" src="/assets/a4149.svg" />
                            </div>
                            <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[12px] leading-[18px]">
                              {profileLocation}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col font-['Hanken_Grotesk:Medium'] font-medium justify-center leading-[0] relative shrink-0 text-[#006c49] text-[11px] whitespace-nowrap">
                          <p className="leading-[22px]">Rank #4 in your Area</p>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex items-center justify-between pt-[8px] relative shrink-0 w-full">
                      <div className="flex gap-[6px] items-center">
                        <div className="relative size-[13.333px]">
                          <img alt="" className="block size-full" src="/assets/d278b.svg" />
                        </div>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[12px] leading-[18px]">
                          38
                        </span>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                          Tasks
                        </span>
                      </div>
                      <div className="bg-[#ccc3d7] rounded-full size-[4px]" />
                      <div className="flex gap-[6px] items-center">
                        <div className="h-[14px] relative w-[12px]">
                          <img alt="" className="block size-full" src="/assets/396ed.svg" />
                        </div>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[12px] leading-[18px]">
                          94%
                        </span>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                          On-time
                        </span>
                      </div>
                      <div className="bg-[#ccc3d7] rounded-full size-[4px]" />
                      <div className="flex gap-[6px] items-center">
                        <div className="h-[12.667px] relative w-[10.667px]">
                          <img alt="" className="block size-full" src="/assets/83a12.svg" />
                        </div>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[12px] leading-[18px]">
                          12d
                        </span>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                          Streak
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top 3 Podium Showcase */}
                <div className="absolute content-stretch flex flex-col items-start left-[16px] pt-[16px] right-[16px] top-[262px]">
                  <div className="content-stretch flex flex-col items-start pt-[4px] relative shrink-0 w-full">
                    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                      <div className="flex items-baseline gap-2">
                        <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px] leading-[24px] tracking-[-0.16px]">
                          Top Performers
                        </span>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                          • SF Area Rank
                        </span>
                      </div>
                      <div className="flex gap-[2px] items-center">
                        <div className="relative size-[12.833px]">
                          <img alt="" className="block size-full" src="/assets/c0196.svg" />
                        </div>
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px] leading-[16px] tracking-[0.44px]">
                          Live Pace
                        </span>
                      </div>
                    </div>

                    {/* Podium Grid */}
                    <div className="content-stretch flex gap-[8px] items-end justify-center pb-[4px] pt-[36px] relative shrink-0 w-full">
                      {/* #2 Jordan Lee */}
                      <div className="content-stretch flex flex-[1_0_0] flex-col isolate items-center min-w-px relative">
                        <div className="content-stretch flex flex-col items-center pb-[8px] relative shrink-0 z-[2]">
                          <div className="pb-[4px]">
                            <div className="bg-[#e9e5ff] border border-[rgba(204,195,215,0.3)] flex gap-[2px] items-center px-[9px] py-[3px] rounded-[4px]">
                              <div className="h-[11.667px] relative w-[5.833px]">
                                <img alt="" className="block size-full" src="/assets/231d3.svg" />
                              </div>
                              <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[11px] leading-[16px]">
                                2nd
                              </span>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="relative rounded-full shadow-md size-[56px] overflow-hidden">
                              <img
                                alt="Jordan Lee"
                                className="absolute h-full left-[-41.76%] max-w-none top-0 w-[183.51%]"
                                src="/assets/ce354.png"
                              />
                            </div>
                            <div className="absolute bg-[#e3dfff] bottom-[-6px] right-[-4px] rounded-full size-[24px] flex items-center justify-center shadow-xs">
                              <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[11px]">2</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col h-[176px] items-center justify-between p-[9px] rounded-[6px] w-full z-[1]">
                          <div className="flex flex-col items-center w-full">
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] leading-[18px]">
                              Jordan Lee
                            </span>
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
                              UX Architect
                            </span>
                            <div className="mt-[2px] bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] flex gap-[2px] items-center px-[7px] py-px rounded-[4px]">
                              <div className="h-[8.333px] relative w-[6.667px]">
                                <img alt="" className="block size-full" src="/assets/a4e51.svg" />
                              </div>
                              <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[10px] leading-[22px]">
                                Oakland, CA
                              </span>
                            </div>
                          </div>
                          <div className="bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] rounded-[4px] w-full py-[5px] flex flex-col items-center">
                            <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px] leading-[16px]">
                              44 tasks
                            </span>
                            <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[10px] leading-[22px]">
                              96% on-time
                            </span>
                          </div>
                          <button
                            onClick={() => showToast('Hire inquiry sent to Jordan Lee!')}
                            className="bg-[#6d28d9] rounded-[6px] w-full py-[4px] flex gap-[4px] items-center justify-center cursor-pointer hover:bg-[#5b21b6]"
                          >
                            <div className="h-[11.875px] relative w-[12.5px]">
                              <img alt="" className="block size-full" src="/assets/ab395.svg" />
                            </div>
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-white text-[11px] leading-[22px]">
                              Hire
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* #1 Maya Chen */}
                      <div className="flex-[1_0_0] h-[282px] min-w-px relative">
                        <div className="absolute flex flex-col items-center left-0 right-0 top-[-24px]">
                          <div className="flex flex-col items-center pb-[8px]">
                            <div className="pb-[4px]">
                              <div className="bg-[#fef3c7] border border-[rgba(252,211,77,0.4)] flex gap-[4px] items-center px-[11px] py-[3px] rounded-[4px]">
                                <div className="h-[11.25px] relative w-[12.5px]">
                                  <img alt="" className="block size-full" src="/assets/4f72c.svg" />
                                </div>
                                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#78350f] text-[11px] leading-[16px]">
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
                                <img alt="Maya Chen" className="size-full object-cover" src="/assets/7356e.png" />
                              </div>
                              <div className="absolute bg-[#fbbf24] bottom-[-6px] right-[-4px] rounded-full size-[24px] flex items-center justify-center shadow-xs">
                                <span className="font-['Hanken_Grotesk:Bold'] text-[#451a03] text-[11px]">1</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white border border-[rgba(83,0,183,0.2)] flex flex-col h-[208px] items-center justify-between overflow-clip p-[11px] relative rounded-[6px] shadow-md w-full">
                            <div className="absolute bg-gradient-to-r from-[#fcd34d] via-[#6d28d9] to-[#6cf8bb] h-[4px] left-0 right-0 top-0" />
                            <div className="flex flex-col items-center pt-[4px] w-full">
                              <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[13px] leading-[18px]">
                                Maya Chen
                              </span>
                              <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px] leading-[16px]">
                                Full Stack Lead
                              </span>
                              <div className="mt-[2px] bg-[rgba(235,221,255,0.4)] border border-[rgba(83,0,183,0.2)] flex gap-[2px] items-center px-[7px] py-px rounded-[4px] max-w-[92px] overflow-hidden">
                                <div className="h-[8.333px] relative shrink-0 w-[6.667px]">
                                  <img alt="" className="block size-full" src="/assets/c2e72.svg" />
                                </div>
                                <span className="font-['Hanken_Grotesk:Bold'] text-[#5300b7] text-[10px] leading-[22px] truncate">
                                  San Francisco, CA
                                </span>
                              </div>
                            </div>
                            <div className="bg-[rgba(235,221,255,0.3)] border border-[rgba(83,0,183,0.2)] rounded-[4px] w-full py-[7px] flex flex-col items-center text-[#5300b7]">
                              <span className="font-['Manrope:Bold'] text-[16px] leading-[16px]">52 tasks</span>
                              <span className="font-['Hanken_Grotesk:SemiBold'] text-[11px] leading-[16px]">
                                99% on-time
                              </span>
                            </div>
                            <button
                              onClick={() => showToast('Hire inquiry sent to Maya Chen!')}
                              className="bg-[#5300b7] rounded-[6px] w-full py-[6px] flex gap-[4px] items-center justify-center cursor-pointer hover:bg-[#430096]"
                            >
                              <div className="h-[11.875px] relative w-[12.5px]">
                                <img alt="" className="block size-full" src="/assets/ab395.svg" />
                              </div>
                              <span className="font-['Hanken_Grotesk:Bold'] text-white text-[11px] leading-[22px]">
                                Hire
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* #3 David Kim */}
                      <div className="content-stretch flex flex-[1_0_0] flex-col isolate items-center min-w-px relative">
                        <div className="content-stretch flex flex-col items-center pb-[8px] relative shrink-0 z-[2]">
                          <div className="pb-[4px]">
                            <div className="bg-[#ffedd5] border border-[#fed7aa] flex gap-[2px] items-center px-[9px] py-[3px] rounded-[4px]">
                              <div className="h-[12.25px] relative w-[9.333px]">
                                <img alt="" className="block size-full" src="/assets/6f9e6.svg" />
                              </div>
                              <span className="font-['Hanken_Grotesk:SemiBold'] text-[#7c2d12] text-[11px] leading-[16px]">
                                3rd
                              </span>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="relative rounded-full shadow-md size-[56px] overflow-hidden">
                              <img alt="David Kim" className="size-full object-cover" src="/assets/99c94.png" />
                            </div>
                            <div className="absolute bg-[#fed7aa] bottom-[-6px] right-[-4px] rounded-full size-[24px] flex items-center justify-center shadow-xs">
                              <span className="font-['Hanken_Grotesk:Bold'] text-[#431407] text-[11px]">3</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col h-[176px] items-center justify-between p-[9px] rounded-[6px] w-full z-[1]">
                          <div className="flex flex-col items-center w-full">
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] leading-[18px]">
                              David Kim
                            </span>
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
                              Product Mgr
                            </span>
                            <div className="mt-[2px] bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] flex gap-[2px] items-center px-[7px] py-px rounded-[4px]">
                              <div className="h-[8.333px] relative w-[6.667px]">
                                <img alt="" className="block size-full" src="/assets/a4e51.svg" />
                              </div>
                              <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[10px] leading-[22px]">
                                San Jose, CA
                              </span>
                            </div>
                          </div>
                          <div className="bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] rounded-[4px] w-full py-[5px] flex flex-col items-center">
                            <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px] leading-[16px]">
                              41 tasks
                            </span>
                            <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[10px] leading-[22px]">
                              92% on-time
                            </span>
                          </div>
                          <button
                            onClick={() => showToast('Hire inquiry sent to David Kim!')}
                            className="bg-[#6d28d9] rounded-[6px] w-full py-[4px] flex gap-[4px] items-center justify-center cursor-pointer hover:bg-[#5b21b6]"
                          >
                            <div className="h-[11.875px] relative w-[12.5px]">
                              <img alt="" className="block size-full" src="/assets/ab395.svg" />
                            </div>
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-white text-[11px] leading-[22px]">
                              Hire
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remaining Rankings List 4 - 8 */}
                <div className="absolute content-stretch flex flex-col items-start left-[16px] pt-[16px] right-[16px] top-[628px]">
                  <div className="content-stretch flex items-center justify-between px-[4px] relative shrink-0 w-full">
                    <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px] leading-[24px] tracking-[-0.16px]">
                      Bay Area Rankings 4 – 8
                    </span>
                    <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                      42 local candidates
                    </span>
                  </div>

                  <div className="flex flex-col gap-[10px] pt-[10px] w-full">
                    {/* Rank #4 Alex Morgan (YOU) */}
                    <div className="bg-[rgba(233,229,255,0.6)] border border-[rgba(83,0,183,0.2)] flex flex-col gap-[8px] p-[13px] relative rounded-[6px] shadow-2xs overflow-hidden w-full">
                      <div className="absolute bg-[#6d28d9] bottom-0 left-0 top-0 w-[6px]" />
                      <div className="flex items-center pl-[4px] gap-[10px]">
                        <span className="font-['Manrope:Bold'] text-[#5300b7] text-[20px] leading-[28px] w-[20px] text-center">
                          4
                        </span>
                        <div className="rounded-full size-[40px] overflow-hidden shrink-0">
                          <img alt="Alex Morgan" className="size-full object-cover" src="/assets/b5198.png" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-[6px]">
                            <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[13px] leading-[18px]">
                              {profileName}
                            </span>
                            <span className="bg-[#ebddff] text-[#250059] font-['Hanken_Grotesk:SemiBold'] text-[10px] px-[6px] rounded-[4px] leading-[20px]">
                              YOU
                            </span>
                          </div>
                          <div className="flex items-center gap-[4px]">
                            <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                              {profileRole} •
                            </span>
                            <div className="flex items-center gap-[2px]">
                              <img alt="" className="h-[10.8px] w-[8.6px]" src="/assets/a4149.svg" />
                              <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[12px] leading-[18px]">
                                {profileLocation}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-[rgba(204,195,215,0.3)] pt-[5px] pl-[24px] flex items-center justify-between">
                        <div className="flex gap-[8px] items-center text-[11px]">
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7]">38 tasks completed</span>
                          <span className="text-[#4a4455]">•</span>
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#006c49]">94% on-time</span>
                        </div>
                        <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[11px]">
                          Open For Work
                        </span>
                      </div>
                    </div>

                    {/* Rank #6 Marcus Vance */}
                    {[
                      {
                        rank: '6',
                        name: 'Marcus Vance',
                        role: 'Product Designer',
                        city: 'Berkeley, CA',
                        tasks: '33 tasks',
                        ontime: '88% on-time',
                        avatar: '/assets/bee0a.png',
                        highlight: false,
                      },
                      {
                        rank: '7',
                        name: 'Elena Rostova',
                        role: 'Data Scientist',
                        city: 'San Mateo, CA',
                        tasks: '31 tasks',
                        ontime: '87% on-time',
                        avatar: '/assets/ce2ef.png',
                        highlight: false,
                      },
                      {
                        rank: '8',
                        name: 'Tyler Brooks',
                        role: 'Frontend Dev',
                        city: 'San Francisco, CA',
                        tasks: '29 tasks',
                        ontime: '85% on-time',
                        avatar: '/assets/b6952.png',
                        highlight: true,
                      },
                    ].map((c) => (
                      <div
                        key={c.rank}
                        className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col gap-[8px] p-[13px] rounded-[6px] shadow-2xs w-full"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex gap-[10px] items-center">
                            <span className="font-['Manrope:SemiBold'] text-[#4a4455] text-[16px] w-[19px] text-center">
                              {c.rank}
                            </span>
                            <div className="rounded-full size-[40px] overflow-hidden shrink-0">
                              <img alt={c.name} className="size-full object-cover" src={c.avatar} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] leading-[18px]">
                                {c.name}
                              </span>
                              <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                                {c.role}
                              </span>
                              <div className="flex items-center gap-[2px]">
                                <img alt="" className="h-[10.8px] w-[8.6px]" src="/assets/a4149.svg" />
                                <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[12px] leading-[18px]">
                                  {c.city}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => showToast(`Hire inquiry sent to ${c.name}!`)}
                            className="bg-[#6d28d9] flex gap-[4px] items-center px-[12px] py-[6px] rounded-[6px] cursor-pointer hover:bg-[#5b21b6]"
                          >
                            <img alt="" className="h-[11.875px] w-[12.5px]" src="/assets/ce3f0.svg" />
                            <span className="font-['Hanken_Grotesk:Medium'] text-[11px] text-white">Hire</span>
                          </button>
                        </div>
                        <div className="border-t border-[rgba(204,195,215,0.3)] pt-[5px] pl-[24px] flex items-center justify-between text-[11px]">
                          <div className="flex gap-[8px] items-center">
                            <span
                              className={`font-['Hanken_Grotesk:SemiBold'] ${
                                c.highlight ? 'text-[#5300b7]' : 'text-[#181445]'
                              }`}
                            >
                              {c.tasks}
                            </span>
                            <span className="text-[#4a4455]">•</span>
                            <span
                              className={
                                c.highlight
                                  ? "font-['Hanken_Grotesk:SemiBold'] text-[#006c49]"
                                  : "font-['Hanken_Grotesk:Regular'] text-[#4a4455]"
                              }
                            >
                              {c.ontime}
                            </span>
                          </div>
                          <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455]">Open For Work</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.85)] left-0 shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] top-0 w-full z-20">
              <div className="flex items-center justify-between pt-[4px] px-[16px] w-full">
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px]">9:41</span>
                <div className="flex gap-[4px] items-center">
                  <img alt="" className="size-[13.333px]" src="/assets/94dbb.svg" />
                  <img alt="" className="h-[11.333px] w-[16px]" src="/assets/1c973.svg" />
                  <img alt="" className="h-[15px] w-[7.5px]" src="/assets/9bfac.svg" />
                </div>
              </div>
              <div className="flex h-[64px] items-center justify-between px-[16px] w-full">
                <div
                  onClick={() => setActiveScreen('tasks')}
                  className="h-[32px] relative w-[132.13px] cursor-pointer"
                >
                  <img alt="Taskora" className="size-full object-contain" src="/assets/4da2d.png" />
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
                      <img alt="Profile" className="size-full object-cover" src="/assets/b5198.png" />
                    </div>
                    <div className="absolute bg-[#006c49] bottom-0 right-0 rounded-full size-[10px] shadow-[0px_0px_0px_2px_#fcf8ff]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating + Button */}
            <button
              onClick={() => setActiveScreen('create-task')}
              className="fixed sm:absolute bottom-[80px] right-[16px] z-20 cursor-pointer"
            >
              <div className="bg-[#6d28d9] flex items-center justify-center rounded-full size-[56px] shadow-[0px_16px_40px_-6px_rgba(109,40,217,0.32),0px_6px_16px_-2px_rgba(109,40,217,0.2)]">
                <img alt="" className="size-[16.333px]" src="/assets/de4cd.svg" />
              </div>
            </button>

            {/* Bottom Nav */}
            <div className="fixed sm:absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.9)] bottom-0 left-0 shadow-[0px_-2px_12px_0px_rgba(109,40,217,0.04)] w-full z-20">
              <div className="flex h-[64px] items-center justify-around px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('tasks')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="h-[13.819px] w-[18.333px]" src="/assets/0b680.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
                    Tasks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('leaderboard')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[16.5px]" src="/assets/f6c90.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px] leading-[16px]">
                    Ranks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('profile')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[18.333px]" src="/assets/a3394.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
                    Profile
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 4: Create Task (node 2:864)
           ===================================================================== */}
        {activeScreen === 'create-task' && (
          <div
            className="bg-[#fcf8ff] content-stretch flex flex-col items-start pb-[140px] relative w-full"
            data-node-id="2:864"
            data-name="Create Task"
          >
            <div className="bg-[#fcf8ff] content-stretch flex flex-col items-start min-h-[927px] pb-[60px] pt-[96px] relative shrink-0 w-full">
              <div className="content-stretch flex flex-col gap-[24px] items-start px-[16px] relative shrink-0 w-full">
                {/* Task Title & Deadline Card */}
                <div className="bg-white border border-[rgba(204,195,215,0.3)] border-solid drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-[16px] items-start p-[25px] relative rounded-[6px] shrink-0 w-full">
                  <div className="flex flex-col gap-[4px] items-start w-full">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px] leading-[18px] tracking-[0.26px]">
                      Task Title
                    </span>
                    <div className="bg-white border border-[rgba(204,195,215,0.6)] flex items-center p-px rounded-[6px] w-full">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="flex-1 px-[14px] py-[10px] font-['Hanken_Grotesk:Regular'] text-[#181445] text-[15px] leading-[22px] outline-none bg-transparent"
                      />
                      <div className="pr-[12px]">
                        <img alt="" className="h-[12px] w-[13.5px]" src="/assets/a896c.svg" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-[4px] items-start w-full">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px] leading-[18px] tracking-[0.26px]">
                      Deadline
                    </span>
                    <div className="bg-white border border-[rgba(204,195,215,0.6)] flex items-center px-[15px] py-[11px] rounded-[6px] w-full">
                      <div className="flex flex-1 gap-[10px] items-center">
                        <img alt="" className="h-[15px] w-[13.5px]" src="/assets/5ca7c.svg" />
                        <input
                          type="text"
                          value={newTaskDeadline}
                          onChange={(e) => setNewTaskDeadline(e.target.value)}
                          className="flex-1 font-['Hanken_Grotesk:Regular'] text-[#181445] text-[15px] leading-[22px] outline-none bg-transparent"
                        />
                      </div>
                      <div className="bg-[rgba(235,221,255,0.8)] rounded-[4px] px-[8px] py-[2px]">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#250059] text-[11px] leading-[22px]">
                          Due in 6d
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtasks Section */}
                <div className="flex flex-col gap-[16px] items-start w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex gap-[8px] items-center">
                      <span className="font-['Manrope:SemiBold'] text-[#181445] text-[20px] leading-[28px] tracking-[-0.3px]">
                        Subtasks
                      </span>
                      <div className="bg-[#e9e5ff] px-[8px] py-[2px] rounded-[4px]">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
                          {draftSubtasks.length} items
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleAddDraftSubtask}
                      className="bg-[#6d28d9] flex gap-[4px] items-center px-[16px] py-[6px] rounded-[6px] cursor-pointer hover:bg-[#5b21b6]"
                    >
                      <img alt="" className="size-[9.333px]" src="/assets/12237.svg" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[13px] text-white leading-[18px]">
                        Add Subtask
                      </span>
                    </button>
                  </div>

                  {/* Subtask Cards */}
                  <div className="flex flex-col gap-[8px] items-start w-full">
                    {draftSubtasks.map((st) => (
                      <div
                        key={st.id}
                        className="bg-white border border-[rgba(204,195,215,0.3)] flex gap-[8px] items-center pl-[17px] pr-[9px] py-[9px] rounded-[6px] w-full"
                      >
                        <div className="flex flex-1 gap-[8px] items-center min-w-0">
                          <img alt="" className="h-[12px] w-[7.5px] shrink-0" src="/assets/65c49.svg" />
                          <div className="bg-[#5300b7] rounded-full size-[8px] shrink-0" />
                          <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px] leading-[24px] tracking-[-0.16px] truncate">
                            {st.title}
                          </span>
                        </div>
                        <div className="flex gap-[4px] items-center shrink-0">
                          <div className="bg-[#efebff] flex gap-[4px] items-center px-[8px] py-[4px] rounded-[4px]">
                            <img alt="" className="size-[10px]" src="/assets/96e39.svg" />
                            <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[11px] leading-[22px]">
                              {st.date}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveDraftSubtask(st.id)}
                            className="flex items-center justify-center rounded-[4px] size-[32px] cursor-pointer hover:bg-[#ffdad6]/50"
                            aria-label="Delete subtask"
                          >
                            <img alt="" className="h-[13.5px] w-[12px]" src="/assets/c10dc.svg" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* New Subtask Form Box */}
                    <div className="bg-white border-2 border-[rgba(109,40,217,0.4)] flex flex-col gap-[8px] items-start p-[18px] rounded-[6px] w-full">
                      <div className="border-b border-[rgba(204,195,215,0.3)] pb-[7px] w-full flex gap-[6px] items-center">
                        <img alt="" className="h-[15px] w-[16.5px]" src="/assets/74bc4.svg" />
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] leading-[18px]">
                          New Subtask
                        </span>
                      </div>

                      <div className="flex flex-col gap-[4px] items-start w-full">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[22px]">
                          Subtask Title
                        </span>
                        <input
                          type="text"
                          value={subtaskTitleInput}
                          onChange={(e) => setSubtaskTitleInput(e.target.value)}
                          placeholder="Enter subtask title (e.g., Design interactive mockups)"
                          className="bg-white border border-[rgba(204,195,215,0.6)] px-[13px] py-[11px] rounded-[4px] shadow-2xs w-full font-['Hanken_Grotesk:Regular'] text-[14px] text-[#181445] placeholder:text-[rgba(123,116,134,0.7)] outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-[4px] items-start w-full">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[22px]">
                          Deadline
                        </span>
                        <div className="bg-white border border-[rgba(204,195,215,0.6)] flex gap-[8px] items-center px-[13px] py-[9px] rounded-[4px] w-full">
                          <img alt="" className="h-[15px] w-[13.5px]" src="/assets/5ca7c.svg" />
                          <input
                            type="text"
                            value={subtaskDateInput}
                            onChange={(e) => setSubtaskDateInput(e.target.value)}
                            className="flex-1 font-['Hanken_Grotesk:Regular'] text-[#181445] text-[14px] leading-[22px] outline-none bg-transparent"
                          />
                        </div>
                      </div>

                      <div className="flex gap-[8px] items-center justify-end pt-[6px] w-full">
                        <button
                          onClick={() => setSubtaskTitleInput('')}
                          className="bg-[#efebff] px-[16px] py-[6px] rounded-[4px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px] leading-[18px] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddDraftSubtask}
                          className="bg-[#6d28d9] flex gap-[4px] items-center px-[24px] py-[6px] rounded-[4px] font-['Hanken_Grotesk:SemiBold'] text-white text-[13px] leading-[18px] cursor-pointer hover:bg-[#5b21b6]"
                        >
                          <img alt="" className="h-[8.017px] w-[10.867px]" src="/assets/39b6c.svg" />
                          <span>Add Subtask</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar (Cancel / Create Task) */}
            <div className="fixed sm:absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.9)] bottom-[64px] left-0 p-[16px] right-0 z-20">
              <div className="flex gap-[8px] items-center w-full">
                <button
                  onClick={() => setActiveScreen('tasks')}
                  className="bg-[#e9e5ff] px-[24px] py-[12px] rounded-[6px] font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] leading-[18px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTaskSubmit}
                  className="bg-[#6d28d9] flex flex-1 gap-[8px] items-center justify-center px-[24px] py-[14px] rounded-[6px] shadow-md cursor-pointer hover:bg-[#5b21b6]"
                >
                  <span className="font-['Manrope:SemiBold'] text-[16px] text-white leading-[22px]">
                    Create Task
                  </span>
                  <img alt="" className="size-[13.333px]" src="/assets/77060.svg" />
                </button>
              </div>
            </div>

            {/* Top Header */}
            <div className="absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.85)] left-0 shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] top-0 w-full z-20">
              <div className="flex items-center justify-between pt-[4px] px-[16px] w-full">
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px]">9:41</span>
                <div className="flex gap-[4px] items-center">
                  <img alt="" className="size-[13.333px]" src="/assets/94dbb.svg" />
                  <img alt="" className="h-[11.333px] w-[16px]" src="/assets/1c973.svg" />
                  <img alt="" className="h-[15px] w-[7.5px]" src="/assets/9bfac.svg" />
                </div>
              </div>
              <div className="flex h-[64px] items-center justify-between px-[16px] w-full">
                <div className="flex gap-[8px] items-center">
                  <button
                    onClick={() => setActiveScreen('tasks')}
                    className="flex items-center justify-center rounded-full size-[44px] cursor-pointer hover:bg-[#efebff]/60"
                  >
                    <img alt="Back" className="h-[20px] w-[11.775px]" src="/assets/8638b.svg" />
                  </button>
                  <span className="text-[14px] text-[rgba(204,195,215,0.6)]">|</span>
                  <span className="font-['Manrope:SemiBold'] text-[#181445] text-[20px] leading-[25px] tracking-[-0.5px]">
                    Create Task
                  </span>
                </div>
                <div
                  onClick={() => setActiveScreen('profile')}
                  className="relative rounded-full shadow-xs size-[32px] overflow-hidden cursor-pointer"
                >
                  <img alt="Profile" className="size-full object-cover" src="/assets/b5198.png" />
                </div>
              </div>
            </div>

            {/* Bottom Nav */}
            <div className="fixed sm:absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.9)] border-t border-[rgba(204,195,215,0.3)] bottom-0 left-0 w-full z-20">
              <div className="flex h-[64px] items-center justify-around px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('tasks')}
                  className="flex flex-col gap-[2px] items-center justify-center cursor-pointer"
                >
                  <img alt="" className="h-[15.075px] w-[20px]" src="/assets/3a8dc.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px] leading-[22px]">
                    Tasks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('leaderboard')}
                  className="flex flex-col gap-[2px] items-center justify-center cursor-pointer"
                >
                  <img alt="" className="size-[18px]" src="/assets/e4c37.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[22px]">
                    Ranks
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('profile')}
                  className="flex flex-col gap-[2px] items-center justify-center cursor-pointer"
                >
                  <img alt="" className="size-[20px]" src="/assets/bc88d.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[22px]">
                    Profile
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 5: Taskora - Login (node 2:1024)
           ===================================================================== */}
        {activeScreen === 'login' && (
          <div
            className="content-stretch flex flex-col items-start relative w-full bg-[#fcf8ff]"
            data-node-id="2:1024"
            data-name="Taskora - Login"
          >
            <div className="bg-[#fcf8ff] content-stretch flex flex-col items-start pb-[120px] pt-[64px] px-[16px] relative shrink-0 w-full">
              <div className="content-stretch flex flex-col items-start pb-[32px] relative shrink-0 w-full">
                {/* Brand Top Section */}
                <div className="content-stretch flex flex-col items-center justify-center pb-[24px] pt-[16px] px-[16px] relative shrink-0 w-full">
                  <div className="pb-[12px] w-[210px] flex justify-center">
                    <div className="aspect-[210/48] w-full max-h-[48px] relative">
                      <img
                        alt="Taskora Logo"
                        className="h-full w-full object-contain"
                        src="/assets/3c190.png"
                      />
                    </div>
                  </div>
                  <div className="max-w-[260px] text-center font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[14px] leading-[22px] tracking-[-0.35px]">
                    <p>Master your workflow with clarity and quiet</p>
                    <p>momentum.</p>
                  </div>
                </div>

                {/* Interactive Auth Container */}
                <div className="content-stretch flex flex-col gap-[16px] items-start w-full">
                  {/* Auth Mode Toggle Tabs */}
                  <div className="bg-[#efebff] flex items-center p-[4px] rounded-[6px] w-full">
                    <button
                      onClick={() => setActiveScreen('login')}
                      className="bg-white flex-1 py-[8px] rounded-[4px] font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px] leading-[18px] shadow-2xs cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setActiveScreen('signup')}
                      className="flex-1 py-[8px] rounded-[4px] font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px] leading-[18px] cursor-pointer"
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Main Auth Card */}
                  <div className="bg-white flex flex-col items-start p-[24px] relative rounded-[8px] shadow-[0px_4px_24px_-4px_rgba(83,0,183,0.06),0px_1px_3px_0px_rgba(0,0,0,0.03)] w-full">
                    <div className="flex flex-col gap-[16px] items-start w-full">
                      {/* Email Field */}
                      <div className="flex flex-col gap-[6px] items-start w-full">
                        <span className="font-['Hanken_Grotesk:Medium'] text-[#181445] text-[13px] leading-[18px]">
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

                      {/* Password Field */}
                      <div className="flex flex-col gap-[6px] items-start w-full">
                        <span className="font-['Hanken_Grotesk:Medium'] text-[#181445] text-[13px] leading-[18px]">
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
                            aria-label="Toggle password visibility"
                          >
                            <img alt="" className="size-full" src="/assets/a6271.svg" />
                          </button>
                        </div>
                      </div>

                      {/* Meta Controls */}
                      <div className="flex items-center justify-between pt-[4px] w-full">
                        <label className="flex gap-[8px] items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="size-[16px] accent-[#6d28d9] rounded-[2.5px]"
                          />
                          <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                            Remember me
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => showToast('Password reset link sent to your email!')}
                          className="font-['Hanken_Grotesk:SemiBold'] text-[#6d28d9] text-[13px] leading-[18px] cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={() => {
                          showToast('Signed in to Taskora!');
                          setActiveScreen('tasks');
                        }}
                        className="bg-[#6d28d9] flex gap-[8px] h-[48px] items-center justify-center rounded-[6px] w-full cursor-pointer hover:bg-[#5b21b6] mt-1"
                      >
                        <span className="font-['Manrope:SemiBold'] text-[16px] text-white leading-[24px]">
                          Sign In
                        </span>
                        <img alt="" className="size-[12px]" src="/assets/03d99.svg" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Secondary Navigation Prompt */}
                  <div className="flex items-center justify-center gap-1.5 w-full pt-1">
                    <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[14px] leading-[22px]">
                      Don&apos;t have an account?
                    </span>
                    <button
                      onClick={() => setActiveScreen('signup')}
                      className="font-['Hanken_Grotesk:SemiBold'] text-[#6d28d9] text-[13px] leading-[18px] cursor-pointer"
                    >
                      Sign up
                    </button>
                  </div>

                  {/* Security & Encryption Pill */}
                  <div className="flex gap-[6px] items-center justify-center pt-[8px] w-full">
                    <img alt="" className="h-[13.333px] w-[10.667px]" src="/assets/5d128.svg" />
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#7b7486] text-[11px] leading-[16px] tracking-[0.44px]">
                      End-to-end 256-bit encrypted productivity workspace
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.8)] left-0 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] top-0 w-full">
              <div className="flex h-[64px] items-center justify-between px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('guest-leaderboard')}
                  className="flex items-center justify-center rounded-full size-[44px] cursor-pointer"
                >
                  <img alt="Back" className="h-[18.333px] w-[10.794px]" src="/assets/e1335.svg" />
                </button>
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px] leading-[18px]">
                  Sign In
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 6: Taskora - Sign Up (node 2:1092)
           ===================================================================== */}
        {activeScreen === 'signup' && (
          <div
            className="content-stretch flex flex-col items-start relative w-full bg-[#fcf8ff]"
            data-node-id="2:1092"
            data-name="Taskora - Sign Up"
          >
            <div className="bg-[#fcf8ff] content-stretch flex flex-col items-start pt-[64px] px-[16px] relative shrink-0 w-full">
              <div className="content-stretch flex flex-col items-start pb-[32px] relative shrink-0 w-full">
                {/* Brand Header */}
                <div className="flex flex-col items-center pb-[24px] pt-[8px] w-full">
                  <div className="pb-[12px] w-[192px]">
                    <div className="aspect-[192/46.5] w-full relative">
                      <img alt="Taskora Logo" className="size-full object-contain" src="/assets/3c190.png" />
                    </div>
                  </div>
                  <span className="font-['Manrope:SemiBold'] text-[#181445] text-[20px] leading-[28px] tracking-[-0.5px]">
                    Create your workspace
                  </span>
                  <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px] pt-[4px]">
                    Join Taskora &amp; boost your daily momentum
                  </span>
                </div>

                {/* Form Card */}
                <div className="bg-white flex flex-col items-start pb-[36px] pt-[20px] px-[20px] relative rounded-[8px] shadow-[0px_4px_24px_-4px_rgba(109,40,217,0.06)] w-full">
                  <div className="flex flex-col gap-[14px] items-start w-full">
                    {/* FULL NAME */}
                    <div className="flex flex-col gap-[4px] items-start w-full">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] tracking-[0.55px] uppercase">
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
                          className="bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[40px] pr-[12px] py-[11px] rounded-[4px] text-[14px] text-[#181445] placeholder:text-[rgba(123,116,134,0.7)] outline-none"
                        />
                      </div>
                    </div>

                    {/* EMAIL ADDRESS */}
                    <div className="flex flex-col gap-[4px] items-start w-full">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] tracking-[0.55px] uppercase">
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
                          className="bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[40px] pr-[12px] py-[11px] rounded-[4px] text-[14px] text-[#181445] placeholder:text-[rgba(123,116,134,0.7)] outline-none"
                        />
                      </div>
                    </div>

                    {/* ROLE / PROFESSION */}
                    <div className="flex flex-col gap-[4px] items-start w-full">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] tracking-[0.55px] uppercase">
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
                          className="bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[40px] pr-[12px] py-[11px] rounded-[4px] text-[14px] text-[#181445] placeholder:text-[rgba(123,116,134,0.7)] outline-none"
                        />
                      </div>
                    </div>

                    {/* COUNTRY & STATE */}
                    <div className="flex gap-[12px] items-start w-full">
                      <div className="flex flex-1 flex-col gap-[4px] items-start min-w-0">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] tracking-[0.55px] uppercase">
                          COUNTRY
                        </span>
                        <div className="relative w-full">
                          <img
                            alt=""
                            className="absolute left-[13.58px] size-[15.833px] top-[13.08px] pointer-events-none"
                            src="/assets/be852.svg"
                          />
                          <select
                            value={signupCountry}
                            onChange={(e) => setSignupCountry(e.target.value)}
                            className="appearance-none bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[38px] pr-[26px] py-[10px] rounded-[4px] text-[14px] text-[#181445] outline-none"
                          >
                            <option>United States</option>
                            <option>Bangladesh</option>
                            <option>United Kingdom</option>
                            <option>Canada</option>
                          </select>
                          <img
                            alt=""
                            className="absolute h-[5.858px] right-[10px] top-[18px] w-[9.5px] pointer-events-none"
                            src="/assets/f6a07.svg"
                          />
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-[4px] items-start min-w-0">
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] tracking-[0.55px] uppercase">
                          STATE / PROVINCE
                        </span>
                        <div className="relative w-full">
                          <img
                            alt=""
                            className="absolute h-[15.833px] left-[15.17px] top-[13.08px] w-[12.667px] pointer-events-none"
                            src="/assets/d3de2.svg"
                          />
                          <select
                            value={signupState}
                            onChange={(e) => setSignupState(e.target.value)}
                            className="appearance-none bg-white border border-[rgba(204,195,215,0.45)] w-full pl-[38px] pr-[26px] py-[10px] rounded-[4px] text-[14px] text-[#181445] outline-none"
                          >
                            <option>California</option>
                            <option>New York</option>
                            <option>Dhaka</option>
                            <option>Texas</option>
                          </select>
                          <img
                            alt=""
                            className="absolute h-[5.858px] right-[10px] top-[18px] w-[9.5px] pointer-events-none"
                            src="/assets/f6a07.svg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PASSWORD */}
                    <div className="flex flex-col gap-[4px] items-start w-full">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] tracking-[0.55px] uppercase">
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
                          className="bg-white border border-[rgba(204,195,215,0.45)] w-full px-[40px] py-[11px] rounded-[4px] text-[14px] text-[#181445] placeholder:text-[rgba(123,116,134,0.7)] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword((p) => !p)}
                          className="absolute right-[10px] top-[5px] size-[32px] flex items-center justify-center cursor-pointer"
                        >
                          <img alt="" className="h-[11.875px] w-[17.417px]" src="/assets/793d2.svg" />
                        </button>
                      </div>
                      {/* Strength Meter */}
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

                    {/* CONFIRM PASSWORD */}
                    <div className="flex flex-col gap-[4px] items-start w-full">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] tracking-[0.55px] uppercase">
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
                          className="bg-white border border-[rgba(204,195,215,0.45)] w-full px-[40px] py-[11px] rounded-[4px] text-[14px] text-[#181445] placeholder:text-[rgba(123,116,134,0.7)] outline-none"
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

                    {/* Terms Checkbox */}
                    <label className="flex gap-[10px] items-center pt-[4px] w-full cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="size-[16px] accent-[#6d28d9] rounded-[3px]"
                      />
                      <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[16.5px]">
                        I agree to the{' '}
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#6d28d9]">Terms of Service</span> and{' '}
                        <span className="font-['Hanken_Grotesk:SemiBold'] text-[#6d28d9]">Privacy Policy</span>
                      </span>
                    </label>

                    {/* Submit */}
                    <button
                      onClick={() => {
                        if (signupName.trim()) setProfileName(signupName.trim());
                        if (signupRole.trim()) setProfileRole(signupRole.trim());
                        showToast('Workspace created! Welcome to Taskora.');
                        setActiveScreen('tasks');
                      }}
                      className="bg-[#6d28d9] flex gap-[8px] items-center justify-center py-[12px] rounded-[6px] shadow-md w-full cursor-pointer hover:bg-[#5b21b6] mt-1"
                    >
                      <span className="font-['Manrope:SemiBold'] text-[16px] text-white leading-[24px]">
                        Create Account
                      </span>
                      <img alt="" className="size-[12px]" src="/assets/03d99.svg" />
                    </button>
                  </div>
                </div>

                {/* Already have an account */}
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

            {/* Header */}
            <div className="absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.8)] left-0 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] top-0 w-full">
              <div className="flex h-[64px] items-center justify-between px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('login')}
                  className="flex items-center justify-center rounded-full size-[44px] cursor-pointer"
                >
                  <img alt="Back" className="h-[18.333px] w-[10.794px]" src="/assets/e1335.svg" />
                </button>
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px] leading-[18px]">
                  Create Account
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 7: Taskora - Guest Home Leaderboard (node 2:1209)
           ===================================================================== */}
        {activeScreen === 'guest-leaderboard' && (
          <div
            className="bg-[#fcf8ff] content-stretch flex flex-col items-start relative w-full"
            data-node-id="2:1209"
            data-name="Taskora - Guest Home Leaderboard"
          >
            <div className="bg-[#fcf8ff] content-stretch flex flex-col items-start min-h-[780px] pb-[112px] pt-[96px] relative shrink-0 w-full">
              <div className="content-stretch flex flex-col items-start pb-[48px] px-[16px] relative shrink-0 w-full">
                {/* Focused Prominent Login / Signup Card */}
                <div
                  className="border border-[rgba(83,0,183,0.2)] border-solid flex flex-col items-start overflow-clip p-[17px] relative rounded-[6px] shadow-md w-full"
                  style={{
                    backgroundImage:
                      'linear-gradient(27.7deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 50%, rgb(246, 242, 255) 100%)',
                  }}
                >
                  <div className="absolute bg-[rgba(235,221,255,0.3)] blur-[40px] right-[-32px] rounded-full size-[112px] top-[-32px]" />
                  <div className="flex flex-col gap-[12px] items-start relative w-full">
                    <div className="bg-[#ebddff] px-[10px] py-[2px] rounded-[4px]">
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#250059] text-[11px] leading-[22px] tracking-[0.55px] uppercase">
                        GUEST VIEW • READY TO GET RANKED?
                      </span>
                    </div>
                    <div className="flex flex-col gap-[4px] items-start w-full">
                      <span className="font-['Manrope:Bold'] text-[#181445] text-[18px] leading-[22.5px]">
                        Join or Sign In to Taskora
                      </span>
                      <div className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                        <p>Track momentum, climb ranks, showcase your skills, and</p>
                        <p>connect or hire top performers worldwide.</p>
                      </div>
                    </div>
                    <div className="border-t border-[rgba(204,195,215,0.2)] flex gap-[8px] items-center pt-[8px] w-full">
                      <button
                        onClick={() => setActiveScreen('login')}
                        className="bg-[#5300b7] flex-1 flex gap-[6px] items-center justify-center px-[12px] py-[8px] rounded-[6px] cursor-pointer hover:bg-[#430096]"
                      >
                        <img alt="" className="size-[12px]" src="/assets/52f1c.svg" />
                        <span className="font-['Hanken_Grotesk:Bold'] text-[13px] text-white leading-[18px]">
                          Log In
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveScreen('signup')}
                        className="bg-[#ebddff] border border-[rgba(83,0,183,0.2)] flex-1 flex gap-[6px] items-center justify-center px-[13px] py-[9px] rounded-[6px] cursor-pointer hover:bg-[#dfd0ff]"
                      >
                        <img alt="" className="h-[10.667px] w-[14.667px]" src="/assets/25526.svg" />
                        <span className="font-['Hanken_Grotesk:Bold'] text-[#250059] text-[13px] leading-[18px]">
                          Sign Up
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Monthly Leaderboard Header & Location Controls */}
                <div className="flex items-center justify-between pt-[18px] w-full">
                  <span className="font-['Manrope:SemiBold'] text-[#181445] text-[24px] leading-[32px] tracking-[-0.6px]">
                    Monthly Leaderboard
                  </span>
                  <div className="bg-[#efebff] border border-[rgba(204,195,215,0.3)] flex gap-[4px] items-center px-[13px] py-[7px] rounded-[6px]">
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[13px] leading-[18px]">
                      Nov 2026
                    </span>
                    <img alt="" className="h-[5.55px] w-[9px]" src="/assets/f0a47.svg" />
                  </div>
                </div>

                <div className="flex flex-col gap-[6px] pt-[12px] w-full">
                  <div className="flex gap-[6px] items-center">
                    <img alt="" className="h-[13.333px] w-[9.333px]" src="/assets/ac60b.svg" />
                    <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[12px] leading-[18px]">
                      Showing performers in San Francisco, CA
                    </span>
                  </div>
                  <div className="flex gap-[8px] items-center w-full">
                    <div className="bg-[#ebddff] border border-[rgba(83,0,183,0.2)] flex-1 p-px relative rounded-[6px]">
                      <div className="border border-[#6b7280] rounded-[6px] px-[33px] py-[9px] relative">
                        <span className="font-['Hanken_Grotesk:Bold'] text-[#250059] text-[13px] leading-[18px]">
                          San Francisco, CA (Default)
                        </span>
                      </div>
                      <img
                        alt=""
                        className="absolute left-[12px] top-1/2 -translate-y-1/2 h-[14.167px] w-[11.333px]"
                        src="/assets/0b5ae.svg"
                      />
                    </div>
                    <div className="bg-[#efebff] border border-[rgba(204,195,215,0.3)] flex gap-[6px] items-center px-[17px] py-[9px] rounded-[6px]">
                      <img alt="" className="size-[13.333px]" src="/assets/47366.svg" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[13px] leading-[18px]">
                        Global
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top 3 Podium Showcase */}
                <div className="flex flex-col pt-[20px] w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-baseline gap-2">
                      <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px] leading-[24px]">
                        Top Performers
                      </span>
                      <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px] leading-[18px]">
                        • SF Area Rank
                      </span>
                    </div>
                    <div className="flex gap-[2px] items-center">
                      <img alt="" className="size-[12.833px]" src="/assets/c0196.svg" />
                      <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px] leading-[16px]">
                        Live Pace
                      </span>
                    </div>
                  </div>

                  {/* Podium Grid */}
                  <div className="flex gap-[8px] items-end justify-center pb-[4px] pt-[36px] w-full">
                    {/* #2 Jordan Lee */}
                    <div className="flex flex-1 flex-col items-center min-w-0">
                      <div className="flex flex-col items-center pb-[8px]">
                        <div className="pb-[4px]">
                          <div className="bg-[#e9e5ff] border border-[rgba(204,195,215,0.3)] flex gap-[2px] items-center px-[9px] py-[3px] rounded-[4px]">
                            <img alt="" className="h-[11.667px] w-[5.833px]" src="/assets/231d3.svg" />
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[11px]">2nd</span>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="relative rounded-full shadow-md size-[56px] overflow-hidden">
                            <img
                              alt="Jordan Lee"
                              className="absolute h-full left-[-41.76%] max-w-none top-0 w-[183.51%]"
                              src="/assets/ce354.png"
                            />
                          </div>
                          <div className="absolute bg-[#e3dfff] bottom-[-6px] right-[-4px] rounded-full size-[24px] flex items-center justify-center shadow-xs">
                            <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[11px]">2</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col h-[176px] items-center justify-between p-[9px] rounded-[6px] w-full">
                        <div className="flex flex-col items-center w-full">
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px]">
                            Jordan Lee
                          </span>
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                            UX Architect
                          </span>
                          <div className="mt-[2px] bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] flex gap-[2px] items-center px-[7px] py-px rounded-[4px]">
                            <img alt="" className="h-[8.333px] w-[6.667px]" src="/assets/a4e51.svg" />
                            <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[10px]">
                              Oakland, CA
                            </span>
                          </div>
                        </div>
                        <div className="bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] rounded-[4px] w-full py-[5px] flex flex-col items-center">
                          <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px]">44 tasks</span>
                          <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[10px]">
                            96% on-time
                          </span>
                        </div>
                        <button
                          onClick={() => showToast('Sign in to hire Jordan Lee')}
                          className="bg-[#6d28d9] rounded-[6px] w-full py-[4px] flex gap-[4px] items-center justify-center cursor-pointer"
                        >
                          <img alt="" className="h-[11.875px] w-[12.5px]" src="/assets/ab395.svg" />
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-white text-[11px]">Hire</span>
                        </button>
                      </div>
                    </div>

                    {/* #1 Maya Chen */}
                    <div className="flex-1 h-[282px] min-w-0 relative">
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
                            <div className="relative rounded-full shadow-lg size-[64px] overflow-hidden">
                              <img alt="Maya Chen" className="size-full object-cover" src="/assets/7356e.png" />
                            </div>
                            <div className="absolute bg-[#fbbf24] bottom-[-6px] right-[-4px] rounded-full size-[24px] flex items-center justify-center shadow-xs">
                              <span className="font-['Hanken_Grotesk:Bold'] text-[#451a03] text-[11px]">1</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white border border-[rgba(83,0,183,0.2)] flex flex-col h-[208px] items-center justify-between overflow-clip p-[11px] relative rounded-[6px] shadow-md w-full">
                          <div className="absolute bg-gradient-to-r from-[#fcd34d] via-[#6d28d9] to-[#6cf8bb] h-[4px] left-0 right-0 top-0" />
                          <div className="flex flex-col items-center pt-[4px] w-full">
                            <span className="font-['Hanken_Grotesk:Bold'] text-[#181445] text-[13px]">Maya Chen</span>
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px]">
                              Full Stack Lead
                            </span>
                            <div className="mt-[2px] bg-[rgba(235,221,255,0.4)] border border-[rgba(83,0,183,0.2)] flex gap-[2px] items-center px-[7px] py-px rounded-[4px] max-w-[92px] overflow-hidden">
                              <img alt="" className="h-[8.333px] w-[6.667px] shrink-0" src="/assets/c2e72.svg" />
                              <span className="font-['Hanken_Grotesk:Bold'] text-[#5300b7] text-[10px] truncate">
                                San Francisco, CA
                              </span>
                            </div>
                          </div>
                          <div className="bg-[rgba(235,221,255,0.3)] border border-[rgba(83,0,183,0.2)] rounded-[4px] w-full py-[7px] flex flex-col items-center text-[#5300b7]">
                            <span className="font-['Manrope:Bold'] text-[16px]">52 tasks</span>
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[11px]">99% on-time</span>
                          </div>
                          <button
                            onClick={() => showToast('Sign in to hire Maya Chen')}
                            className="bg-[#5300b7] rounded-[6px] w-full py-[6px] flex gap-[4px] items-center justify-center cursor-pointer"
                          >
                            <img alt="" className="h-[11.875px] w-[12.5px]" src="/assets/ab395.svg" />
                            <span className="font-['Hanken_Grotesk:Bold'] text-white text-[11px]">Hire</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* #3 David Kim */}
                    <div className="flex flex-1 flex-col items-center min-w-0">
                      <div className="flex flex-col items-center pb-[8px]">
                        <div className="pb-[4px]">
                          <div className="bg-[#ffedd5] border border-[#fed7aa] flex gap-[2px] items-center px-[9px] py-[3px] rounded-[4px]">
                            <img alt="" className="h-[12.25px] w-[9.333px]" src="/assets/6f9e6.svg" />
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#7c2d12] text-[11px]">3rd</span>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="relative rounded-full shadow-md size-[56px] overflow-hidden">
                            <img alt="David Kim" className="size-full object-cover" src="/assets/99c94.png" />
                          </div>
                          <div className="absolute bg-[#fed7aa] bottom-[-6px] right-[-4px] rounded-full size-[24px] flex items-center justify-center shadow-xs">
                            <span className="font-['Hanken_Grotesk:Bold'] text-[#431407] text-[11px]">3</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col h-[176px] items-center justify-between p-[9px] rounded-[6px] w-full">
                        <div className="flex flex-col items-center w-full">
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px]">David Kim</span>
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px]">
                            Product Mgr
                          </span>
                          <div className="mt-[2px] bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] flex gap-[2px] items-center px-[7px] py-px rounded-[4px]">
                            <img alt="" className="h-[8.333px] w-[6.667px]" src="/assets/a4e51.svg" />
                            <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[10px]">
                              San Jose, CA
                            </span>
                          </div>
                        </div>
                        <div className="bg-[#f6f2ff] border border-[rgba(204,195,215,0.2)] rounded-[4px] w-full py-[5px] flex flex-col items-center">
                          <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px]">41 tasks</span>
                          <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[10px]">
                            92% on-time
                          </span>
                        </div>
                        <button
                          onClick={() => showToast('Sign in to hire David Kim')}
                          className="bg-[#6d28d9] rounded-[6px] w-full py-[4px] flex gap-[4px] items-center justify-center cursor-pointer"
                        >
                          <img alt="" className="h-[11.875px] w-[12.5px]" src="/assets/ab395.svg" />
                          <span className="font-['Hanken_Grotesk:SemiBold'] text-white text-[11px]">Hire</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guest Rankings 4 - 8 */}
                <div className="flex flex-col pt-[20px] w-full">
                  <div className="flex items-center justify-between px-[4px] w-full">
                    <span className="font-['Manrope:SemiBold'] text-[#181445] text-[16px]">
                      Bay Area Rankings 4 – 8
                    </span>
                    <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                      42 local candidates
                    </span>
                  </div>
                  <div className="flex flex-col gap-[10px] pt-[10px] w-full">
                    {[
                      {
                        rank: '4',
                        name: 'Chloe Vance',
                        role: 'Software Developer',
                        city: 'San Francisco, CA',
                        tasks: '38 tasks',
                        ontime: '94% on-time',
                        avatar: '/assets/b5198.png',
                        greenOnTime: true,
                      },
                      {
                        rank: '6',
                        name: 'Marcus Vance',
                        role: 'Product Designer',
                        city: 'Berkeley, CA',
                        tasks: '33 tasks',
                        ontime: '88% on-time',
                        avatar: '/assets/bee0a.png',
                        greenOnTime: false,
                      },
                      {
                        rank: '7',
                        name: 'Elena Rostova',
                        role: 'Data Scientist',
                        city: 'San Mateo, CA',
                        tasks: '31 tasks',
                        ontime: '87% on-time',
                        avatar: '/assets/ce2ef.png',
                        greenOnTime: false,
                      },
                      {
                        rank: '8',
                        name: 'Tyler Brooks',
                        role: 'Frontend Dev',
                        city: 'San Francisco, CA',
                        tasks: '29 tasks',
                        ontime: '85% on-time',
                        avatar: '/assets/b6952.png',
                        greenOnTime: true,
                      },
                    ].map((c) => (
                      <div
                        key={c.rank}
                        className="bg-white border border-[rgba(204,195,215,0.3)] flex flex-col gap-[8px] p-[13px] rounded-[6px] shadow-2xs w-full"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex gap-[10px] items-center">
                            <span className="font-['Manrope:SemiBold'] text-[#4a4455] text-[16px] w-[18px] text-center">
                              {c.rank}
                            </span>
                            <div className="rounded-full size-[40px] overflow-hidden shrink-0">
                              <img alt={c.name} className="size-full object-cover" src={c.avatar} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px]">
                                {c.name}
                              </span>
                              <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455] text-[12px]">
                                {c.role}
                              </span>
                              <div className="flex items-center gap-[2px]">
                                <img alt="" className="h-[10.8px] w-[8.6px]" src="/assets/a4149.svg" />
                                <span className="font-['Hanken_Grotesk:Medium'] text-[#5300b7] text-[12px]">
                                  {c.city}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => showToast(`Sign in to hire ${c.name}`)}
                            className="bg-[#6d28d9] flex gap-[4px] items-center px-[12px] py-[6px] rounded-[6px] cursor-pointer"
                          >
                            <img alt="" className="h-[11.875px] w-[12.5px]" src="/assets/ce3f0.svg" />
                            <span className="font-['Hanken_Grotesk:Medium'] text-[11px] text-white">Hire</span>
                          </button>
                        </div>
                        <div className="border-t border-[rgba(204,195,215,0.3)] pt-[5px] pl-[24px] flex items-center justify-between text-[11px]">
                          <div className="flex gap-[8px] items-center">
                            <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445]">{c.tasks}</span>
                            <span className="text-[#4a4455]">•</span>
                            <span
                              className={
                                c.greenOnTime
                                  ? "font-['Hanken_Grotesk:SemiBold'] text-[#006c49]"
                                  : "font-['Hanken_Grotesk:Regular'] text-[#4a4455]"
                              }
                            >
                              {c.ontime}
                            </span>
                          </div>
                          <span className="font-['Hanken_Grotesk:Regular'] text-[#4a4455]">Open For Work</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Header */}
            <div className="absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.85)] left-0 shadow-[0px_1px_8px_0px_rgba(109,40,217,0.04)] top-0 w-full z-20">
              <div className="flex items-center justify-between pt-[4px] px-[16px] w-full">
                <span className="font-['Hanken_Grotesk:SemiBold'] text-[#181445] text-[13px]">9:41</span>
                <div className="flex gap-[4px] items-center">
                  <img alt="" className="size-[13.333px]" src="/assets/94dbb.svg" />
                  <img alt="" className="h-[11.333px] w-[16px]" src="/assets/1c973.svg" />
                  <img alt="" className="h-[15px] w-[7.5px]" src="/assets/9bfac.svg" />
                </div>
              </div>
              <div className="flex h-[64px] items-center justify-between px-[16px] w-full">
                <div className="h-[32px] relative w-[132.13px]">
                  <img alt="Taskora" className="size-full object-contain" src="/assets/4da2d.png" />
                </div>
                <div className="flex gap-[4px] items-center">
                  <button className="flex items-center justify-center rounded-full size-[44px]">
                    <img alt="" className="size-[16.5px]" src="/assets/0ef90.svg" />
                  </button>
                  <button
                    onClick={() => setActiveScreen('login')}
                    className="bg-[#ebddff] flex gap-[6px] items-center px-[12px] py-[6px] rounded-full cursor-pointer hover:bg-[#dfd0ff]"
                  >
                    <img alt="" className="size-[12px]" src="/assets/eac4d.svg" />
                    <span className="font-['Hanken_Grotesk:SemiBold'] text-[#250059] text-[13px]">Log In</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Floating + Button */}
            <button
              onClick={() => setActiveScreen('login')}
              className="fixed sm:absolute bottom-[80.5px] right-[16px] z-20 cursor-pointer"
            >
              <div className="bg-[#6d28d9] flex items-center justify-center rounded-full size-[56px] shadow-[0px_16px_40px_-6px_rgba(109,40,217,0.32),0px_6px_16px_-2px_rgba(109,40,217,0.2)]">
                <img alt="" className="size-[16.333px]" src="/assets/de4cd.svg" />
              </div>
            </button>

            {/* Guest Bottom Nav */}
            <div className="fixed sm:absolute backdrop-blur-[24px] bg-[rgba(252,248,255,0.9)] bottom-0 left-0 shadow-[0px_-2px_12px_0px_rgba(109,40,217,0.04)] w-full z-20">
              <div className="flex h-[64px] items-center justify-around px-[16px] w-full">
                <button
                  onClick={() => setActiveScreen('guest-leaderboard')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="h-[16.5px] w-[14.667px]" src="/assets/97194.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#5300b7] text-[11px] leading-[16px]">
                    Home
                  </span>
                </button>
                <button
                  onClick={() => setActiveScreen('login')}
                  className="flex flex-col gap-[4px] items-center justify-center min-h-[44px] min-w-[56px] cursor-pointer"
                >
                  <img alt="" className="size-[16.5px]" src="/assets/f44c8.svg" />
                  <span className="font-['Hanken_Grotesk:SemiBold'] text-[#4a4455] text-[11px] leading-[16px]">
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
