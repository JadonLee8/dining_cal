"use client"
import { useState } from 'react';
import diningData from '../public/dining_data.json';

interface MenuItem {
  name: string;
  id: string;
}

interface Station {
  category_id: string;
  items: MenuItem[];
}

interface Menu {
  [key: string]: Station;
}

interface DiningPeriod {
  success: boolean;
  menu: Menu;
}

interface DayData {
  periods: {
    [key: string]: string;
  };
  [key: string]: DiningPeriod | { [key: string]: string };
}

type DiningData = {
  [date: string]: DayData;
};

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(Object.keys(diningData)[0]));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2025, 3, 1)); // April 2025 (months are 0-based)

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      if (direction === 'prev') {
        newMonth.setMonth(prevMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(prevMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfMonth = firstDay.getDay();
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      days.push(currentDate);
    }

    // Add empty cells for remaining days to complete the grid
    const remainingDays = (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7; 
    for (let i = 0; i < remainingDays; i++) {
      days.push(null);
    }
    
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getMenuItems = (date: Date) => {
    const dayData = (diningData as unknown as DiningData)[date.toISOString().split('T')[0]];
    if (!dayData) return [];
    
    const items: string[] = [];
    Object.keys(dayData).forEach(period => {
      if (period !== 'periods' && period !== 'full_success') {
        const periodData = dayData[period];
        if (typeof periodData === 'object' && periodData !== null && 'menu' in periodData) {
          const diningPeriod = periodData as DiningPeriod;
          Object.values(diningPeriod.menu).forEach(station => {
            station.items.forEach(item => {
              items.push(item.name);
            });
          });
        }
      }
    });
    console.log(items);
    return items; // TODO: fix the items being empty
  };

  const days = getDaysInMonth(currentMonth);
  const menuItems = getMenuItems(selectedDate);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Dining Calendar</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="text-xl font-semibold text-gray-800">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button 
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-600">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg min-h-[120px] cursor-pointer transition-colors ${
                  day?.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0]
                    ? 'bg-gray-800 text-white'
                    : day
                    ? 'bg-gray-50 hover:bg-gray-200'
                    : 'bg-transparent'
                }`}
                onClick={() => day && setSelectedDate(day)}
              >
                {day && (
                  <>
                    <div className="font-semibold mb-2">
                      {day.getDate()}
                    </div>
                    <div className="text-sm">
                      {getMenuItems(day).slice(0, 2).map((item, i) => (
                        <div key={i} className="truncate">
                          {item}
                        </div>
                      ))}
                      {getMenuItems(day).length > 2 && (
                        <div className="text-gray-500">+{getMenuItems(day).length - 2} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {formatDate(selectedDate)}
          </h2>
          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
