import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Timetable } from './Timetable';
import { DeadlineTracker } from './DeadlineTracker';
import { Analytics } from './Analytics';
import { LanguageSwitcher } from './LanguageSwitcher';

export const StudyFlowLayout = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок с переключателем языков */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">StudyFlow</h1>
            <p className="text-gray-600">{t('layout.subtitle')}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Основные вкладки */}
        <Tabs defaultValue="timetable" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timetable">{t('layout.timetable')}</TabsTrigger>
            <TabsTrigger value="deadlines">{t('layout.deadlines')}</TabsTrigger>
            <TabsTrigger value="analytics">{t('layout.analytics')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timetable" className="mt-6">
            <Timetable />
          </TabsContent>
          
          <TabsContent value="deadlines" className="mt-6">
            <DeadlineTracker />
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-6">
            <Analytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}; 