import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CalendarIcon, PlusCircle, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '../../lib/utils';
import { useStudyFlowStore } from '../../lib/store/studyflow-store';
import type { Task, Priority } from '../../lib/store/studyflow-store';

// Цвета для меток приоритета
const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

// Ключи предметов для переводов
const SUBJECT_KEYS = [
  'subjectMath',
  'subjectPhysics',
  'subjectChemistry',
  'subjectBiology',
  'subjectHistory',
  'subjectLiterature',
  'subjectEnglish',
  'subjectComputing',
  'subjectOther',
];

// Цвета для предметов по ключам
const getSubjectColor = (subjectLabel: string, t: any): string => {
  // Найдем ключ предмета по переводу
  const subjectKey = SUBJECT_KEYS.find(key => t(`deadlineTracker.${key}`) === subjectLabel);
  
  const colorMap: Record<string, string> = {
    'subjectMath': 'bg-blue-100 text-blue-800',
    'subjectPhysics': 'bg-purple-100 text-purple-800',
    'subjectChemistry': 'bg-green-100 text-green-800',
    'subjectBiology': 'bg-emerald-100 text-emerald-800',
    'subjectHistory': 'bg-amber-100 text-amber-800',
    'subjectLiterature': 'bg-pink-100 text-pink-800',
    'subjectEnglish': 'bg-indigo-100 text-indigo-800',
    'subjectComputing': 'bg-gray-100 text-gray-800',
    'subjectOther': 'bg-slate-100 text-slate-800',
  };
  
  return subjectKey ? colorMap[subjectKey] : 'bg-gray-100 text-gray-800';
};

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (task: Omit<Task, 'id' | 'createdAt'>) => void;
}

const AddTaskDialog = ({ open, onOpenChange, onAdd }: AddTaskDialogProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<Priority>('medium');
  const [label, setLabel] = useState(t('deadlineTracker.subjectOther'));
  const [estimatedTime, setEstimatedTime] = useState(1);
  
  const handleAdd = () => {
    if (!title.trim() || !deadline) return;
    
    onAdd({
      title: title.trim(),
      description: description.trim(),
      deadline: deadline.toISOString(),
      priority,
      label,
      estimatedTime,
      completed: false,
    });
    
    // Сброс формы
    setTitle('');
    setDescription('');
    setDeadline(undefined);
    setPriority('medium');
    setLabel(t('deadlineTracker.subjectOther'));
    setEstimatedTime(1);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('deadlineTracker.addTask')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">{t('deadlineTracker.taskTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('deadlineTracker.titlePlaceholder')}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="description">{t('deadlineTracker.description')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('deadlineTracker.descriptionPlaceholder')}
              className="mt-1"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('deadlineTracker.deadline')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal mt-1',
                      !deadline && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, 'PPP') : t('deadlineTracker.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label>{t('deadlineTracker.estimatedTime')}</Label>
              <Input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('deadlineTracker.priority')}</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('deadlineTracker.priorityLow')}</SelectItem>
                  <SelectItem value="medium">{t('deadlineTracker.priorityMedium')}</SelectItem>
                  <SelectItem value="high">{t('deadlineTracker.priorityHigh')}</SelectItem>
                  <SelectItem value="urgent">{t('deadlineTracker.priorityUrgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{t('deadlineTracker.label')}</Label>
              <Select value={label} onValueChange={setLabel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_KEYS.map(key => (
                    <SelectItem key={key} value={t(`deadlineTracker.${key}`)}>{t(`deadlineTracker.${key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={!title.trim() || !deadline}>
              {t('deadlineTracker.add')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const TaskItem = ({ task, onToggleComplete, onDelete }: TaskItemProps) => {
  const { t, i18n } = useTranslation();
  
  // Проверка близости дедлайна
  const deadline = parseISO(task.deadline);
  const now = new Date();
  const isOverdue = isBefore(deadline, now);
  const isDueSoon = !isOverdue && isBefore(deadline, addDays(now, 3));
  
  const dateLocale = i18n.language === 'ru' ? ru : undefined;
  
  // Определение статуса задачи
  const getStatusIcon = () => {
    if (task.completed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (isOverdue) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    if (isDueSoon) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return null;
  };
  
  return (
    <Card className={cn(
      'p-4 transition-all',
      task.completed && 'opacity-60',
      isOverdue && !task.completed && 'border-red-200 bg-red-50',
      isDueSoon && !task.completed && 'border-yellow-200 bg-yellow-50'
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleComplete(task.id)}
          className="mt-1"
        >
          {getStatusIcon() || (
            <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={cn(
                'font-medium',
                task.completed && 'line-through text-gray-500'
              )}>
                {task.title}
              </h3>
              {task.description && (
                <p className={cn(
                  'text-sm text-gray-600 mt-1',
                  task.completed && 'line-through'
                )}>
                  {task.description}
                </p>
              )}
            </div>
            
            <button
              onClick={() => onDelete(task.id)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                getSubjectColor(task.label, t)
              )}
            >
              {task.label}
            </Badge>
            
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  PRIORITY_COLORS[task.priority]
                )}
              />
              <span className="text-xs text-gray-600">
                {t(`deadlineTracker.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`)}
              </span>
            </div>
            
            <span className="text-xs text-gray-600">
              {task.estimatedTime}h
            </span>
            
            <span className={cn(
              'text-xs',
              isOverdue ? 'text-red-600 font-medium' : 
              isDueSoon ? 'text-yellow-600 font-medium' : 'text-gray-600'
            )}>
              {format(deadline, 'MMM d, yyyy', { locale: dateLocale })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const DeadlineTracker = () => {
  const { t } = useTranslation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterLabel, setFilterLabel] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  
  const { tasks, addTask, updateTask, deleteTask } = useStudyFlowStore();
  
  // Фильтрация задач
  const filteredTasks = tasks.filter(task => {
    if (!showCompleted && task.completed) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (filterLabel !== 'all' && task.label !== filterLabel) return false;
    return true;
  });
  
  // Сортировка по дате дедлайна
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const dateA = parseISO(a.deadline);
    const dateB = parseISO(b.deadline);
    return dateA.getTime() - dateB.getTime();
  });
  
  const handleToggleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      updateTask(taskId, { completed: !task.completed });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('deadlineTracker.title')}</h2>
          <p className="text-gray-600">{t('deadlineTracker.subtitle')}</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          {t('deadlineTracker.addTask')}
        </Button>
      </div>
      
      {/* Фильтры */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Label>{t('deadlineTracker.filterByPriority')}</Label>
            <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value as Priority | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('deadlineTracker.all')}</SelectItem>
                <SelectItem value="low">{t('deadlineTracker.priorityLow')}</SelectItem>
                <SelectItem value="medium">{t('deadlineTracker.priorityMedium')}</SelectItem>
                <SelectItem value="high">{t('deadlineTracker.priorityHigh')}</SelectItem>
                <SelectItem value="urgent">{t('deadlineTracker.priorityUrgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label>{t('deadlineTracker.filterByLabel')}</Label>
            <Select value={filterLabel} onValueChange={setFilterLabel}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('deadlineTracker.all')}</SelectItem>
                {SUBJECT_KEYS.map(key => {
                  const translatedLabel = t(`deadlineTracker.${key}`);
                  return (
                    <SelectItem key={key} value={translatedLabel}>{translatedLabel}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-completed"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="show-completed">{t('deadlineTracker.showCompleted')}</Label>
          </div>
        </div>
      </Card>
      
      {/* Список задач */}
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">{t('deadlineTracker.noTasks')}</p>
          </Card>
        ) : (
          sortedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onDelete={deleteTask}
            />
          ))
        )}
      </div>
      
      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={addTask}
      />
    </div>
  );
}; 