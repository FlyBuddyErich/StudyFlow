import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useStudyFlowStore } from '../../lib/store/studyflow-store';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

// Цвета для графиков
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export const Analytics = () => {
  const { t, i18n } = useTranslation();
  const { timeBlocks, tasks } = useStudyFlowStore();
  
  const dateLocale = i18n.language === 'ru' ? ru : undefined;
  
  // Анализ продуктивности по дням недели
  const weeklyProductivity = useMemo(() => {
    const currentWeekStart = startOfWeek(new Date());
    const currentWeekEnd = endOfWeek(new Date());
    const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
    
    return weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTimeBlocks = timeBlocks.filter(block => block.day === dayStr);
      const totalHours = dayTimeBlocks.reduce((sum, block) => {
        const start = parseISO(block.start);
        const end = parseISO(block.end);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      
      return {
        day: format(day, 'EEE', { locale: dateLocale }),
        hours: Math.round(totalHours * 10) / 10,
      };
    });
  }, [timeBlocks, i18n.language]);
  
  // Анализ времени по меткам
  const timeByLabel = useMemo(() => {
    const labelMap = new Map<string, number>();
    
    timeBlocks.forEach(block => {
      const start = parseISO(block.start);
      const end = parseISO(block.end);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
                           // Используем название блока как метку или "Общее"
         const label: string = block.title || 'Общее';
         labelMap.set(label, (labelMap.get(label) || 0) + hours);
    });
    
    return Array.from(labelMap.entries()).map(([label, hours]) => ({
      label,
      hours: Math.round(hours * 10) / 10,
    }));
  }, [timeBlocks]);
  
  // Анализ задач по приоритету
  const tasksByPriority = useMemo(() => {
    const priorityMap = new Map<string, number>();
    
    tasks.forEach(task => {
      const priority = t(`deadlineTracker.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`);
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
    });
    
    return Array.from(priorityMap.entries()).map(([priority, count]) => ({
      priority,
      count,
    }));
  }, [tasks, t]);
  
  // Статистика выполнения задач
  const completionStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      total,
      completed,
      pending: total - completed,
      completionRate,
    };
  }, [tasks]);
  
  // Прогресс изучения за неделю
  const weeklyProgress = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });
    
    return last7Days.map(date => {
      const dayStr = format(date, 'yyyy-MM-dd');
      const dayTimeBlocks = timeBlocks.filter(block => block.day === dayStr);
      const dayTasks = tasks.filter(task => {
        const taskDate = parseISO(task.deadline);
        return isSameDay(taskDate, date) && task.completed;
      });
      
      const studyHours = dayTimeBlocks.reduce((sum, block) => {
        const start = parseISO(block.start);
        const end = parseISO(block.end);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);
      
      return {
        date: format(date, 'MMM d', { locale: dateLocale }),
        studyHours: Math.round(studyHours * 10) / 10,
        tasksCompleted: dayTasks.length,
      };
    });
  }, [timeBlocks, tasks, i18n.language]);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('analytics.title')}</h2>
        <p className="text-gray-600">{t('analytics.subtitle')}</p>
      </div>
      
      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{completionStats.total}</div>
          <div className="text-gray-600">{t('analytics.totalTasks')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{completionStats.completed}</div>
          <div className="text-gray-600">{t('analytics.completedTasks')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">{completionStats.pending}</div>
          <div className="text-gray-600">{t('analytics.pendingTasks')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{completionStats.completionRate}%</div>
          <div className="text-gray-600">{t('analytics.completionRate')}</div>
        </Card>
      </div>
      
      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Продуктивность по дням недели */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('analytics.weeklyProductivity')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyProductivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}h`, t('analytics.studyHours')]} />
              <Bar dataKey="hours" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        
        {/* Время по предметам/меткам */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('analytics.timeBySubject')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={timeByLabel}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ label, hours }) => `${label}: ${hours}h`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="hours"
              >
                {timeByLabel.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}h`, t('analytics.studyHours')]} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        
        {/* Задачи по приоритету */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('analytics.tasksByPriority')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tasksByPriority}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="priority" />
              <YAxis />
              <Tooltip formatter={(value) => [value, t('analytics.tasks')]} />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        
        {/* Прогресс за неделю */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('analytics.weeklyProgress')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="studyHours" 
                stroke="#8884d8" 
                name={t('analytics.studyHours')}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="tasksCompleted" 
                stroke="#82ca9d" 
                name={t('analytics.tasksCompleted')}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}; 