export const translations = {
  en: {
    dashboard: "Dashboard",
    clientsMap: "Clients & Map",
    kanbanView: "Kanban View",
    settings: "Settings",
    addClient: "Add Client",
    logout: "Logout",
    questsDone: "Quests Done",
    level: "Lv.",
    quests: "Daily Quests",
    viewClients: "View Clients",
    skip: "Skip...",
    skip1: "Skip 1 Day",
    skip3: "Skip 3 Days",
    skip5: "Skip 5 Days",
    skip7: "Skip 7 Days",
    skip15: "Skip 15 Days",
    skip30: "Skip 30 Days",
    done: "Done",
    emailLogs: "Communication Logs",
    addLog: "Add Log",
    draftWithAI: "Draft with AI",
    inbox: "Inbox",
    outbox: "Outbox",
    compose: "Compose",
    search: "Search clients...",
    status: {
      lead: "Lead",
      contacted: "Contacted",
      sample: "Sample Sent",
      negotiating: "Negotiating",
      closed: "Closed Won"
    },
    'Wake up Dormant Clients': 'Wake up Dormant Clients',
    'Contact 1 client inactive for >30 days.': 'Contact 1 client inactive for >30 days.',
    'First Blood': 'First Blood',
    'Send out the first development email of the day.': 'Send out the first development email of the day.',
    'Follow Up Master': 'Follow Up Master',
    'Complete scheduled follow-ups.': 'Complete scheduled follow-ups.',
    'Level Progress': 'Level Progress',
    'Day Streak': 'Day Streak',
    'EXP Today': 'EXP Today',
    'Lifetime Events': 'Lifetime Events',
    'Agent Dashboard': 'Agent Dashboard',
    'Track your progress and complete daily tasks to level up.': 'Track your progress and complete daily tasks to level up.'
  },
  zh: {
    dashboard: "控制台",
    clientsMap: "客户与地图",
    kanbanView: "看板视图",
    settings: "设置",
    addClient: "添加客户",
    logout: "退出登录",
    questsDone: "任务完成数",
    level: "等级",
    quests: "日常任务",
    viewClients: "查看客户",
    skip: "跳过...",
    skip1: "跳过 1 天",
    skip3: "跳过 3 天",
    skip5: "跳过 5 天",
    skip7: "跳过 7 天",
    skip15: "跳过 15 天",
    skip30: "跳过 30 天",
    done: "已完成",
    emailLogs: "沟通记录",
    addLog: "添加记录",
    draftWithAI: "AI 起草",
    inbox: "收件箱",
    outbox: "发件箱",
    compose: "写邮件",
    search: "搜索客户...",
    status: {
      lead: "潜在客户",
      contacted: "已联系",
      sample: "已寄样",
      negotiating: "谈判中",
      closed: "已成交"
    },
    'Wake up Dormant Clients': '唤醒沉睡客户',
    'Contact 1 client inactive for >30 days.': '联系1个超过30天未沟通的客户。',
    'First Blood': '首杀',
    'Send out the first development email of the day.': '发送今天的第一封开发信。',
    'Follow Up Master': '跟进大师',
    'Complete scheduled follow-ups.': '完成所有计划的跟进回访。',
    'Level Progress': '等级进度',
    'Day Streak': '连续签到',
    'EXP Today': '今日经验',
    'Lifetime Events': '里程碑事件',
    'Agent Dashboard': '销售代理控制台',
    'Track your progress and complete daily tasks to level up.': '追踪您的进度并完成日常任务以升级。'
  }
};

export function useTranslation(language: 'en' | 'zh') {
  return function t(key: string): string {
    const keys = key.split('.');
    let value: any = translations[language];
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Fallback to literal if nested not found
        // if exact string matches top level it can also be handled:
        if (translations[language][key as keyof typeof translations['en']]) return translations[language][key as keyof typeof translations['en']] as string;
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };
}
