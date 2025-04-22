"use client"
import { useState, useEffect, useRef } from 'react'; // Import useEffect and useRef
import diningData from '../public/dining_data.json';
import Image from 'next/image';

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

interface LocationData {
  SBISA?: DiningPeriod;
  COMMONS?: DiningPeriod;
}

interface DayData {
  periods: {
    [key: string]: string;
  };
  [key: string]: LocationData | { [key: string]: string };
}

type DiningData = {
  [date: string]: DayData;
};

interface StationItems {
  stationName: string;
  items: string[];
}

interface PeriodData {
  periodName: string;
  stations: StationItems[];
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string>(Object.keys(diningData)[0]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2025, 3, 1)); // April 2025 (months are 0-based)
  const [selectedLocation, setSelectedLocation] = useState<'SBISA' | 'COMMONS'>('SBISA');
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [expandedStations, setExpandedStations] = useState<Set<string>>(new Set());
  const [hoveredPeriod, setHoveredPeriod] = useState<{
    period: PeriodData;
    element: HTMLElement | null;
  } | null>(null);
  // State to keep track of the pinned tooltip
  const [pinnedPeriodInfo, setPinnedPeriodInfo] = useState<{
    date: string;
    periodName: string;
    element: HTMLElement | null;
    periodData: PeriodData; // Store the actual data too
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null); // Ref for the tooltip element

  const togglePeriod = (periodName: string) => {
    setExpandedPeriods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(periodName)) {
        newSet.delete(periodName);
      } else {
        newSet.add(periodName);
      }
      return newSet;
    });
  };

  const toggleStation = (stationName: string) => {
    setExpandedStations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stationName)) {
        newSet.delete(stationName);
      } else {
        newSet.add(stationName);
      }
      return newSet;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      if (direction === 'prev') {
        newMonth.setMonth(prevMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(prevMonth.getMonth() + 1);
      }
      // Close pinned tooltip when navigating months
      setPinnedPeriodInfo(null);
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
      const dateString = currentDate.toISOString().split('T')[0];
      days.push(dateString);
    }

    // Add empty cells for remaining days to complete the grid
    const remainingDays = (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7;
    for (let i = 0; i < remainingDays; i++) {
      days.push(null);
    }

    return days;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getMenuItems = (date: string) => {
    const dayData = (diningData as unknown as DiningData)[date];
    if (!dayData) return [];

    const periodData: PeriodData[] = [];
    Object.entries(dayData).forEach(([period, data]) => {
      if (period !== 'periods') {
        const locationData = data as LocationData;
        if (locationData[selectedLocation]?.menu) {
          const stations: StationItems[] = [];
          Object.entries(locationData[selectedLocation]!.menu).forEach(([stationName, station]) => {
            const items = station.items.map(item => item.name);
            if (items.length > 0) {
              stations.push({ stationName, items });
            }
          });
          if (stations.length > 0) {
            periodData.push({
              periodName: period,
              stations
            });
          }
        }
      }
    });
    return periodData;
  };

  const days = getDaysInMonth(currentMonth);
  const menuItems = getMenuItems(selectedDate);

  // Function to handle showing the tooltip on hover
  const showTooltip = (event: React.MouseEvent, period: PeriodData, date: string) => {
    event.stopPropagation();
    // Only show hover tooltip if nothing is pinned or if the hovered item is not the pinned one
    if (!pinnedPeriodInfo || (pinnedPeriodInfo.periodName !== period.periodName || pinnedPeriodInfo.date !== date)) {
      setHoveredPeriod({
        period,
        element: event.currentTarget as HTMLElement
      });
    }
  };

  // Function to handle hiding the tooltip on hover leave
  const hideTooltip = () => {
    setHoveredPeriod(null);
  };

  // Function to handle clicking a period box to pin/unpin tooltip
  const handlePeriodClick = (event: React.MouseEvent, period: PeriodData, date: string) => {
    event.stopPropagation(); // Prevent calendar day click if necessary
    const currentTarget = event.currentTarget as HTMLElement;

    if (pinnedPeriodInfo && pinnedPeriodInfo.date === date && pinnedPeriodInfo.periodName === period.periodName) {
      // If clicking the already pinned period, unpin it
      setPinnedPeriodInfo(null);
    } else {
      // Otherwise, pin the new period
      setPinnedPeriodInfo({
        date: date,
        periodName: period.periodName,
        element: currentTarget,
        periodData: period // Store the period data
      });
      setHoveredPeriod(null); // Hide hover tooltip when pinning
    }
  };

  // Effect to handle clicks outside the pinned tooltip to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pinnedPeriodInfo &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        pinnedPeriodInfo.element &&
        !pinnedPeriodInfo.element.contains(event.target as Node)
      ) {
        // Clicked outside the tooltip AND outside the originating element
        setPinnedPeriodInfo(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [pinnedPeriodInfo]); // Re-run effect if pinnedPeriodInfo changes

  // Determine which tooltip data to display (pinned takes priority)
  const displayTooltipData = pinnedPeriodInfo || hoveredPeriod;
  const isPinned = !!pinnedPeriodInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="max-w-7xl mx-auto">
        <a
          href="https://jadonlee.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-4 left-4 text-gray-600 hover:text-gray-800 transition-colors backdrop-blur-sm bg-white/30 px-4 py-2 rounded-lg"
        >
          jadonlee.dev
        </a>
        <div className="relative w-full max-w-md mx-auto mb-8 h-32">
          <div className="absolute inset-0 overflow-hidden rounded-lg shadow-lg">
            <div
              className={`absolute inset-0 transition-opacity duration-500 ${
                selectedLocation === 'SBISA' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src="/sbisa.png"
                alt="SBISA"
                fill
                className="object-cover brightness-50"
                priority
              />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-500 ${
                selectedLocation === 'COMMONS' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src="/commons.png"
                alt="COMMONS"
                fill
                className="object-cover brightness-50"
                priority
              />
            </div>
          </div>
          <div className="relative flex items-center justify-center h-full">
            <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-1 shadow-lg">
              <button
                onClick={() => {
                  setSelectedLocation('SBISA');
                  setPinnedPeriodInfo(null);
                }} // Close tooltip on location change
                className={`relative z-10 px-8 py-2 text-lg font-semibold transition-colors rounded-lg ${
                  selectedLocation === 'SBISA' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'
                }`}
              >
                SBISA
              </button>
              <button
                onClick={() => {
                  setSelectedLocation('COMMONS');
                  setPinnedPeriodInfo(null);
                }} // Close tooltip on location change
                className={`relative z-10 px-8 py-2 text-lg font-semibold transition-colors rounded-lg ${
                  selectedLocation === 'COMMONS' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'
                }`}
              >
                COMMONS
              </button>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-sm bg-white/30 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="text-xl font-semibold text-gray-800 backdrop-blur-sm bg-white/30 px-4 py-2 rounded-lg">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div
                key={day}
                className="text-center font-semibold text-gray-600 backdrop-blur-sm bg-white/30 p-2 rounded-lg"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg min-h-[120px] transition-colors backdrop-blur-sm relative overflow-visible ${
                  day === selectedDate
                    ? 'bg-gray-800/30 text-white'
                    : day
                    ? 'bg-white/30 hover:bg-white/50 cursor-pointer' // Only add cursor pointer if it's a valid day
                    : 'bg-transparent'
                }`}
                onClick={() => {
                  if (day) {
                    setSelectedDate(day);
                    // Optionally close pinned tooltip when selecting a new date
                    // setPinnedPeriodInfo(null);
                  }
                }}
              >
                {day && (
                  <>
                    <div className="font-semibold mb-2">{new Date(day).getUTCDate()}</div>
                    <div className="space-y-1 relative z-10">
                      {/* Ensure period boxes are clickable */}
                      {getMenuItems(day).map((period, i) => (
                        <div
                          key={i}
                          className={`text-xs p-1 rounded bg-white/30 backdrop-blur-sm transition-colors cursor-pointer ${
                            period.periodName.toLowerCase().includes('breakfast')
                              ? 'hover:bg-blue-400/50'
                              : period.periodName.toLowerCase().includes('lunch')
                              ? 'hover:bg-green-400/50'
                              : period.periodName.toLowerCase().includes('dinner')
                              ? 'hover:bg-purple-400/50'
                              : 'hover:bg-orange-400/50'
                          } ${
                            // Add visual indicator if this period is pinned
                            pinnedPeriodInfo?.date === day && pinnedPeriodInfo?.periodName === period.periodName
                              ? 'ring-2 ring-offset-1 ring-blue-500'
                              : ''
                          }`}
                          onMouseEnter={e => showTooltip(e, period, day)} // Pass day here
                          onMouseLeave={hideTooltip}
                          onClick={e => handlePeriodClick(e, period, day)} // Use new click handler
                        >
                          {period.periodName}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip component - Renders based on pinned or hovered state */}
        {displayTooltipData && displayTooltipData.element && (
          <div ref={tooltipRef} className="fixed inset-0 pointer-events-none z-[9999]">
            {/* Added ref here */}
            <div
              className={`absolute bg-white/95 backdrop-blur-md rounded-lg shadow-xl p-3 text-xs border border-gray-200 ${
                isPinned ? 'pointer-events-auto' : ''
              }`} // Allow pointer events only if pinned
              style={{
                top: displayTooltipData.element.getBoundingClientRect().bottom + 5 + 'px',
                left: displayTooltipData.element.getBoundingClientRect().left + 'px',
                maxWidth: '250px',
                minWidth: '200px'
              }}
            >
              {/* Add a close button if the tooltip is pinned */}
              {isPinned && (
                <button
                  onClick={() => setPinnedPeriodInfo(null)}
                  className="absolute top-1 right-1 p-0.5 bg-gray-200/50 hover:bg-gray-300/70 rounded-full text-gray-600 z-10"
                  // Ensure button is clickable
                  aria-label="Close tooltip"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {/* Access period data correctly based on pinned or hovered */}
              {(isPinned
                ? pinnedPeriodInfo!.periodData
                : (displayTooltipData as { period: PeriodData }).period
              ).stations.map(
                (station: StationItems, stationIndex: number) => (
                  <div
                    key={stationIndex}
                    className={`py-1 border-b border-gray-100 last:border-0 ${
                      isPinned ? 'pt-4' : ''
                    }`}
                  >
                    {/* Add padding top if pinned and close button exists */}
                    <div className="font-semibold text-gray-800">{station.stationName}</div>
                    <div className="text-gray-600 truncate">{station.items[0]}</div>
                    {/* You could add more items here if needed */}
                    {/* {station.items.slice(1, 3).map((item, idx) => (
                    <div key={idx} className="text-gray-500 text-xs pl-2 truncate">{item}</div>
                  ))} */}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="backdrop-blur-sm bg-white/30 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 backdrop-blur-sm bg-white/30 p-3 rounded-lg">
            {formatDate(selectedDate)}
          </h2>
          {menuItems.length > 0 ? (
            <div className="space-y-4">
              {menuItems.map((period, periodIndex) => (
                <div key={periodIndex} className="space-y-2">
                  <button
                    onClick={() => togglePeriod(period.periodName)}
                    className="w-full flex items-center justify-between text-lg font-semibold text-gray-800 backdrop-blur-sm bg-white/30 p-2 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <span className="capitalize">{period.periodName}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className={`w-5 h-5 transition-transform duration-200 ${
                        expandedPeriods.has(period.periodName) ? 'rotate-180' : ''
                      }`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {expandedPeriods.has(period.periodName) && (
                    <div className="space-y-2 pl-4">
                      {period.stations.map((station, stationIndex) => (
                        <div key={stationIndex} className="space-y-2">
                          <button
                            onClick={() => toggleStation(station.stationName)}
                            className="w-full flex items-center justify-between text-md font-semibold text-gray-700 backdrop-blur-sm bg-white/30 p-2 rounded-lg hover:bg-white/50 transition-colors"
                          >
                            <span>{station.stationName}</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className={`w-4 h-4 transition-transform duration-200 ${
                                expandedStations.has(station.stationName) ? 'rotate-180' : ''
                              }`}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                          {expandedStations.has(station.stationName) && (
                            <div className="space-y-2 pl-4">
                              {station.items.map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className="p-3 bg-white/30 rounded-lg backdrop-blur-sm hover:bg-white/50 transition-colors"
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-600 p-4 backdrop-blur-sm bg-white/30 rounded-lg">
              No menu items available for this date
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
