import { useState } from "react";

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getCalendarDays(date: Date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const mondayIndex = (firstDay.getDay() + 6) % 7;
    const days: Array<number | null> = Array(mondayIndex).fill(null);

    for (let day = 1; day <= daysInMonth; day += 1) {
        days.push(day);
    }

    while (days.length % 7 !== 0) {
        days.push(null);
    }

    return days;
}

export function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const today = new Date();
    const days = getCalendarDays(currentDate);
    const monthName = currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

    function changeMonth(amount: number) {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + amount, 1));
    }

    function goToToday() {
        setCurrentDate(new Date());
    }

    return (
        <section className="calendar-card" aria-label="Calendario mensual">
            <div className="calendar-header">
                <div>
                    <p className="eyebrow">Agenda</p>
                    <h2>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2>
                </div>
                <div className="calendar-actions">
                    <button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Mes anterior">‹</button>
                    <button className="today-button" onClick={goToToday}>Hoy</button>
                    <button className="icon-button" onClick={() => changeMonth(1)} aria-label="Mes siguiente">›</button>
                </div>
            </div>

            <div className="calendar-grid calendar-weekdays">
                {weekDays.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="calendar-grid calendar-days">
                {days.map((day, index) => {
                    const isToday = day === today.getDate()
                        && currentDate.getMonth() === today.getMonth()
                        && currentDate.getFullYear() === today.getFullYear();

                    return (
                        <button className={`calendar-day ${isToday ? "is-today" : ""}`} key={`${day}-${index}`} disabled={!day}>
                            {day}
                            {isToday && <span className="day-dot" />}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
