import React, { useState, useEffect } from 'react';
import ct from 'countries-and-timezones';
import { Clock } from 'lucide-react';

const COUNTRY_MAPPINGS: Record<string, string> = {
  "United States": "US",
  "Turkey": "TR",
  "Côte d'Ivoire": "CI",
  "Congo (Congo-Brazzaville)": "CG",
  "Czechia (Czech Republic)": "CZ",
  "Myanmar (formerly Burma)": "MM",
  "Palestine State": "PS",
  "South Korea": "KR",
  "North Korea": "KP",
  "United Kingdom": "GB",
};

export function LocalTime({ country, className }: { country?: string, className?: string }) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    if (!country) {
      setTime('');
      return;
    }

    const mapCode = COUNTRY_MAPPINGS[country];
    let found = null;
    
    if (mapCode) {
      found = ct.getCountry(mapCode);
    } else {
      const allCountries = ct.getAllCountries();
      found = Object.values(allCountries).find(
        (c) => c.name.toLowerCase() === country.toLowerCase() || 
               c.name.toLowerCase().includes(country.toLowerCase()) || 
               country.toLowerCase().includes(c.name.toLowerCase())
      );
    }

    const timezone = found && found.timezones.length > 0 ? found.timezones[0] : null;

    if (!timezone) {
      setTime('');
      return;
    }

    const updateTime = () => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        setTime(formatter.format(new Date()));
      } catch (err) {
        setTime('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [country]);

  if (!time) return null;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 rounded-md text-xs font-medium text-slate-300 ${className || ''}`}>
      <Clock className="w-3.5 h-3.5 text-cyan-400" />
      <span>{time} Local Time</span>
    </div>
  );
}
