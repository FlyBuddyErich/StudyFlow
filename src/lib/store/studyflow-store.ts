import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';

// Интерфейсы данных
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  completed: boolean;
  priority: Priority;
  label: string;
  estimatedTime: number;
  createdAt: string;
}

export interface TimeBlock {
  id: string;
  taskId?: string;
  title: string;
  start: string;
  end: string;
  day: string;
  color?: string;
}

export interface StudySession {
  id: string;
  taskId?: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  productivity: number;
  notes?: string;
}

interface StudyFlowState {
  tasks: Task[];
  timeBlocks: TimeBlock[];
  studySessions: StudySession[];
  
  // Действия с задачами
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => string;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  
  // Действия с блоками времени
  addTimeBlock: (timeBlock: Omit<TimeBlock, 'id'>) => string;
  updateTimeBlock: (id: string, updates: Partial<Omit<TimeBlock, 'id'>>) => void;
  deleteTimeBlock: (id: string) => void;
  
  // Действия с сессиями обучения
  addStudySession: (session: Omit<StudySession, 'id'>) => string;
  updateStudySession: (id: string, updates: Partial<Omit<StudySession, 'id'>>) => void;
  deleteStudySession: (id: string) => void;
  
  // Утилитарные функции
  getUpcomingDeadlines: (days: number) => Task[];
  getTasksForToday: () => Task[];
  getTimeBlocksForDay: (day: string) => TimeBlock[];
  getProductivityData: (days: number) => Array<{date: string, productivity: number}>;
}

export const useStudyFlowStore = create<StudyFlowState>()(
  persist(
    (set, get) => ({
      tasks: [],
      timeBlocks: [],
      studySessions: [],
      
      // Управление задачами
      addTask: (task) => {
        const id = uuidv4();
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...task,
              id,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },
      
      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) => 
            task.id === id ? { ...task, ...updates } : task
          ),
        }));
      },
      
      completeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) => 
            task.id === id ? { ...task, completed: true } : task
          ),
        }));
      },
      
      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },
      
      // Управление блоками времени
      addTimeBlock: (timeBlock) => {
        const id = uuidv4();
        set((state) => ({
          timeBlocks: [
            ...state.timeBlocks,
            {
              ...timeBlock,
              id,
            },
          ],
        }));
        return id;
      },
      
      updateTimeBlock: (id, updates) => {
        set((state) => ({
          timeBlocks: state.timeBlocks.map((block) => 
            block.id === id ? { ...block, ...updates } : block
          ),
        }));
      },
      
      deleteTimeBlock: (id) => {
        set((state) => ({
          timeBlocks: state.timeBlocks.filter((block) => block.id !== id),
        }));
      },
      
      // Управление сессиями обучения
      addStudySession: (session) => {
        const id = uuidv4();
        set((state) => ({
          studySessions: [
            ...state.studySessions,
            {
              ...session,
              id,
            },
          ],
        }));
        return id;
      },
      
      updateStudySession: (id, updates) => {
        set((state) => ({
          studySessions: state.studySessions.map((session) => 
            session.id === id ? { ...session, ...updates } : session
          ),
        }));
      },
      
      deleteStudySession: (id) => {
        set((state) => ({
          studySessions: state.studySessions.filter((session) => session.id !== id),
        }));
      },
      
      // Получение ближайших дедлайнов
      getUpcomingDeadlines: (days) => {
        const { tasks } = get();
        const today = startOfDay(new Date());
        const futureDate = addDays(today, days);
        
        return tasks.filter((task) => {
          if (!task.deadline || task.completed) return false;
          const deadlineDate = parseISO(task.deadline);
          return isAfter(deadlineDate, today) && isBefore(deadlineDate, futureDate);
        }).sort((a, b) => {
          if (!a.deadline || !b.deadline) return 0;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
      },
      
      getTasksForToday: () => {
        const { tasks, timeBlocks } = get();
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Получение всех задач, запланированных на сегодня
        const todayTaskIds = timeBlocks
          .filter((block) => block.day === today && block.taskId)
          .map((block) => block.taskId);
        
        return tasks.filter((task) => 
          todayTaskIds.includes(task.id) || 
          (task.deadline && format(parseISO(task.deadline), 'yyyy-MM-dd') === today && !task.completed)
        );
      },
      
      getTimeBlocksForDay: (day) => {
        const { timeBlocks } = get();
        return timeBlocks.filter((block) => block.day === day);
      },
      
      getProductivityData: (days) => {
        const { studySessions } = get();
        const result: Array<{date: string, productivity: number}> = [];
        
        // Группировка сессий по дням
        const sessionsByDay = studySessions.reduce((acc, session) => {
          const day = format(parseISO(session.startTime), 'yyyy-MM-dd');
          
          if (!acc[day]) {
            acc[day] = { total: 0, count: 0 };
          }
          
          acc[day].total += session.productivity;
          acc[day].count += 1;
          
          return acc;
        }, {} as Record<string, { total: number, count: number }>);
        
        // Расчет средней продуктивности за день
        Object.entries(sessionsByDay).forEach(([date, { total, count }]) => {
          result.push({
            date,
            productivity: Math.round((total / count) * 10) / 10,
          });
        });
        
        // Сортировка по дате
        return result.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ).slice(-days);
      },
    }),
    {
      name: 'studyflow-storage',
    }
  )
); 