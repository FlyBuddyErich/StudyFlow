import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay, pointerWithin, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { useStudyFlowStore } from '../../lib/store/studyflow-store';
import type { TimeBlock } from '../../lib/store/studyflow-store';
import { toast } from 'sonner';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
// Дни недели будут переведены в зависимости от языка
const DAYS_OF_WEEK_INDICES = [0, 1, 2, 3, 4, 5, 6];

// Форматирование часов
const formatHour = (hour: number) => {
  return `${hour}:00`;
};

// Цвета для блоков времени
const COLORS = [
  'bg-red-200',
  'bg-blue-200',
  'bg-green-200',
  'bg-yellow-200',
  'bg-purple-200',
  'bg-pink-200',
  'bg-indigo-200',
  'bg-orange-200',
];

// Перевод названий дней недели в зависимости от языка
const getDayNames = (locale: string) => {
  const dateLocale = locale === 'ru' ? ru : undefined;
  
  return DAYS_OF_WEEK_INDICES.map(dayIndex => {
    const date = new Date(2024, 0, dayIndex + 1);
    return format(date, 'EEEE', { locale: dateLocale });
  });
};

interface TimeBlockItemProps {
  timeBlock: TimeBlock;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  durationHours?: number;
}

const TimeBlockItem = ({ timeBlock, onDelete, isDragging = false, durationHours = 1 }: TimeBlockItemProps) => {
  const { i18n } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: timeBlock.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  // Форматирование времени
  const dateLocale = i18n.language === 'ru' ? ru : undefined;
  const startTime = format(parseISO(timeBlock.start), 'HH:mm', { locale: dateLocale });
  const endTime = format(parseISO(timeBlock.end), 'HH:mm', { locale: dateLocale });
  
  // Форматирование продолжительности
  const formattedDuration = 
    Number.isInteger(durationHours) 
      ? `${durationHours}h` 
      : `${durationHours.toFixed(1)}h`;
  
  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${timeBlock.color || 'bg-blue-200'} rounded-md cursor-move w-full relative shadow-sm`}
    >
      <div className="p-2">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-1">
            <div className="font-medium truncate">{timeBlock.title}</div>
            <div className="text-xs flex items-center justify-between">
              <span>{startTime} - {endTime}</span>
              <span className="ml-1 px-1.5 py-0.5 bg-white/30 rounded text-xs">
                {formattedDuration}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(timeBlock.id);
            }}
            className="text-gray-700 hover:text-gray-900 rounded-full h-5 w-5 flex items-center justify-center"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface AddTimeBlockDialogProps {
  selectedDay: string;
  selectedHour: number;
  onAdd: (timeBlock: Omit<TimeBlock, 'id'>) => void;
}

const AddTimeBlockDialog = ({ selectedDay, selectedHour, onAdd }: AddTimeBlockDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(1);
  const [color, setColor] = useState(COLORS[0]);

  const handleAdd = () => {
    if (!title.trim()) return;
    
    const day = selectedDay;
    const start = new Date(day);
    start.setHours(selectedHour, 0, 0);
    
    const end = new Date(start);
    end.setHours(start.getHours() + duration, 0, 0);
    
    // Проверяем, что время не выходит за пределы дня
    if (end.getDate() !== start.getDate()) {
      end.setHours(23, 59, 59);
    }
    
    onAdd({
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      day,
      color,
    });
    
    setTitle('');
    setDuration(1);
    setColor(COLORS[0]);
    setOpen(false);
    
    toast.success('Time block added successfully');
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full h-full flex items-center justify-center hover:bg-gray-50 transition-colors">
          <PlusCircle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('timetable.addTimeBlock')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('deadlineTracker.taskTitle')}</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Study Session"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('timetable.duration')}</label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="8"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-24"
              />
              <div className="text-sm text-gray-500">
                {selectedHour}:00 - {selectedHour + duration}:00
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('timetable.color')}</label>
            <div className="flex space-x-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleAdd} disabled={!title.trim()}>
              {t('timetable.add')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface TimeCellProps {
  day: string;
  hour: number;
  timeBlocks: TimeBlock[];
  onDeleteTimeBlock: (id: string) => void;
  onAddTimeBlock: (timeBlock: Omit<TimeBlock, 'id'>) => void;
}

const TimeCell = ({ 
  day, 
  hour, 
  timeBlocks, 
  onDeleteTimeBlock, 
  onAddTimeBlock
}: TimeCellProps) => {
  // Фильтрация блоков, которые начинаются в этот час или проходят через него
  const blocksForCell = timeBlocks.filter(block => {
    const blockStartDate = new Date(block.start);
    const blockEndDate = new Date(block.end);
    const currentHourStart = new Date(day);
    currentHourStart.setHours(hour, 0, 0, 0);
    const currentHourEnd = new Date(day);
    currentHourEnd.setHours(hour + 1, 0, 0, 0);
    
    return (
      blockStartDate.getHours() === hour ||
      (blockStartDate < currentHourStart && blockEndDate > currentHourStart)
    );
  });

  // Проверка первого вхождения блока
  const isFirstOccurrence = (block: TimeBlock) => {
    const blockStartDate = new Date(block.start);
    return blockStartDate.getHours() === hour;
  };
  
  // Блоки, которые проходят через этот час, но не начинаются здесь
  const spanningBlocks = blocksForCell.filter(block => {
    const blockStartDate = new Date(block.start);
    return blockStartDate.getHours() !== hour;
  });
  
  const startingBlocksForCell = blocksForCell.filter(isFirstOccurrence);
  
  return (
    <div 
      className={`border border-gray-200 h-16 relative ${spanningBlocks.length > 0 ? 'bg-gray-50/50' : ''}`}
      data-day={day}
      data-hour={hour}
    >
      {/* Индикатор для блоков, проходящих через этот час */}
      {spanningBlocks.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          {spanningBlocks.map(block => (
            <div key={block.id} className={`h-1.5 w-full absolute top-1/2 -translate-y-1/2 ${block.color || 'bg-blue-200'}`} />
          ))}
        </div>
      )}
      
      {startingBlocksForCell.length > 0 ? (
        <div className="p-1 h-full w-full">
          <SortableContext 
            items={startingBlocksForCell.map(block => block.id)} 
            strategy={verticalListSortingStrategy}
          >
            {startingBlocksForCell.map(block => {
              // Расчет продолжительности блока в часах
              const startDate = new Date(block.start);
              const endDate = new Date(block.end);
              const durationMs = endDate.getTime() - startDate.getTime();
              const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;
              
              return (
                <TimeBlockItem
                  key={block.id}
                  timeBlock={block}
                  onDelete={onDeleteTimeBlock}
                  durationHours={durationHours}
                />
              );
            })}
          </SortableContext>
        </div>
      ) : !spanningBlocks.length ? (
        <AddTimeBlockDialog
          selectedDay={day}
          selectedHour={hour}
          onAdd={onAddTimeBlock}
        />
      ) : null}
    </div>
  );
};

export const Timetable = () => {
  const { t, i18n } = useTranslation();
  
  // Начало текущей недели
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  
  // Состояние для перетаскивания блоков
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTimeBlock, setActiveTimeBlock] = useState<TimeBlock | null>(null);
  
  // Доступ к хранилищу
  const { timeBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock } = useStudyFlowStore();
  
  // Названия дней недели в зависимости от языка
  const daysOfWeek = useMemo(() => getDayNames(i18n.language), [i18n.language]);
  
  // Сенсоры для drag-and-drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );
  
  // Генерация дат для каждого дня недели
  const weekDates = useMemo(() => {
    return DAYS_OF_WEEK_INDICES.map((_, index) => {
      const date = addDays(weekStart, index);
      return format(date, 'yyyy-MM-dd');
    });
  }, [weekStart]);
  
  // Блоки времени для текущей недели
  const weekTimeBlocks = useMemo(() => {
    return timeBlocks.filter(block => weekDates.includes(block.day));
  }, [timeBlocks, weekDates]);
  
  // Начало перетаскивания
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const draggedTimeBlock = timeBlocks.find(block => block.id === active.id);
    if (draggedTimeBlock) {
      setActiveTimeBlock(draggedTimeBlock);
    }
  }, [timeBlocks]);
  
  // Обработка перетаскивания
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (!over) return;
    
    if (over.data.current?.type === 'cell') {
      // Подсветка целевой ячейки
    }
  }, []);
  
  // Завершение перетаскивания
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveTimeBlock(null);
    
    if (!over) return;
    
    // Перемещение на другой блок времени
    if (active.id !== over.id && over.data.current?.sortable) {
      const activeTimeBlock = timeBlocks.find(block => block.id === active.id);
      const overTimeBlock = timeBlocks.find(block => block.id === over.id);
      
      if (activeTimeBlock && overTimeBlock) {
        // Получение продолжительности блоков
        const activeStart = new Date(activeTimeBlock.start);
        const activeEnd = new Date(activeTimeBlock.end);
        const activeDurationMs = activeEnd.getTime() - activeStart.getTime();
        
        const overStart = new Date(overTimeBlock.start);
        const overEnd = new Date(overTimeBlock.end);
        const overDurationMs = overEnd.getTime() - overStart.getTime();
        
        // Создание нового времени для активного блока
        const newActiveStart = new Date(overStart);
        const newActiveEnd = new Date(newActiveStart);
        newActiveEnd.setTime(newActiveStart.getTime() + activeDurationMs);
        
        // Создание нового времени для блока назначения
        const newOverStart = new Date(activeStart);
        const newOverEnd = new Date(newOverStart);
        newOverEnd.setTime(newOverStart.getTime() + overDurationMs);
        
        // Применение изменений
        updateTimeBlock(activeTimeBlock.id, {
          start: newActiveStart.toISOString(),
          end: newActiveEnd.toISOString(),
          day: overTimeBlock.day,
        });
        
        updateTimeBlock(overTimeBlock.id, {
          start: newOverStart.toISOString(),
          end: newOverEnd.toISOString(),
          day: activeTimeBlock.day,
        });
        
        toast.success('Time blocks swapped');
      }
    } 
    // Перемещение в пустую ячейку
    else if (over.data.current?.day && over.data.current?.hour !== undefined) {
      const activeTimeBlock = timeBlocks.find(block => block.id === active.id);
      
      if (activeTimeBlock) {
        const day = over.data.current.day as string;
        const hour = over.data.current.hour as number;
        
        // Расчет исходной продолжительности
        const oldStart = new Date(activeTimeBlock.start);
        const oldEnd = new Date(activeTimeBlock.end);
        const durationMs = oldEnd.getTime() - oldStart.getTime();
        
        // Расчет нового времени начала и окончания
        const newStart = new Date(day);
        newStart.setHours(hour, 0, 0);
        
        const newEnd = new Date(newStart);
        newEnd.setTime(newStart.getTime() + durationMs);
        
        // Проверка, что время не выходит за пределы дня
        if (newEnd.getDate() !== newStart.getDate()) {
          newEnd.setHours(23, 59, 59);
        }
        
        updateTimeBlock(activeTimeBlock.id, {
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          day,
        });
        
        toast.success('Time block moved');
      }
    }
  }, [timeBlocks, updateTimeBlock]);
  

  
  // Переход к предыдущей неделе
  const handlePrevWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };
  
  // Переход к следующей неделе
  const handleNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };
  
  // Форматирование отображения недели
  const weekDisplay = useMemo(() => {
    const dateLocale = i18n.language === 'ru' ? ru : undefined;
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, 'MMM d', { locale: dateLocale })} - ${format(weekEnd, 'MMM d, yyyy', { locale: dateLocale })}`;
  }, [weekStart, i18n.language]);
  
  // Определение коллизий для drag-and-drop
  const collisionDetection = useCallback((args: any) => {
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    
    return closestCenter(args);
  }, []);
  
  return (
    <Card className="w-full overflow-auto">
      <div className="flex justify-between items-center p-4 border-b">
        <Button variant="outline" onClick={handlePrevWeek}>{t('timetable.previousWeek')}</Button>
        <h2 className="text-xl font-bold">{weekDisplay}</h2>
        <Button variant="outline" onClick={handleNextWeek}>{t('timetable.nextWeek')}</Button>
      </div>
      
      <div className="grid grid-cols-[auto_repeat(7,1fr)]">
        {/* Колонка с часами */}
        <div className="bg-gray-50">
          <div className="h-12 border-b border-r border-gray-200" />
          {HOURS.map(hour => (
            <div key={hour} className="h-16 border-b border-r border-gray-200 p-2 text-sm font-medium">
              {formatHour(hour)}
            </div>
          ))}
        </div>
        
        {/* Дни недели */}
        {daysOfWeek.map((day, index) => (
          <div key={day} className="min-w-[150px]">
            <div className="h-12 border-b border-gray-200 flex items-center justify-center font-bold">
              <div className="text-center">
                <div>{day}</div>
                <div className="text-xs">
                  {format(addDays(weekStart, index), 'MMM d', { locale: i18n.language === 'ru' ? ru : undefined })}
                </div>
              </div>
            </div>
            
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              collisionDetection={collisionDetection}
            >
              {HOURS.map(hour => (
                <TimeCell
                  key={`${weekDates[index]}-${hour}`}
                  day={weekDates[index]}
                  hour={hour}
                  timeBlocks={weekTimeBlocks.filter(block => block.day === weekDates[index])}
                  onDeleteTimeBlock={deleteTimeBlock}
                  onAddTimeBlock={addTimeBlock}
                />
              ))}
              
              {/* Визуализация перетаскивания */}
              <DragOverlay>
                {activeId && activeTimeBlock ? (
                  <TimeBlockItem 
                    timeBlock={activeTimeBlock} 
                    onDelete={() => {}} 
                    isDragging 
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        ))}
      </div>
    </Card>
  );
}; 