
export function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    const divisions = [
        { amount: 60, name: "seconds" },
        { amount: 60, name: "minutes" },
        { amount: 24, name: "hours" },
        { amount: 7,  name: "days" },
        { amount: 4.34524, name: "weeks" },
        { amount: 12, name: "months" },
        { amount: Infinity, name: "years" },
    ];

    let duration = seconds;
    for (let i = 0; i < divisions.length; i++) {
        if (Math.abs(duration) < divisions[i].amount) {
            return rtf.format(-Math.round(duration), divisions[i].name.slice(0, -1));
        }
        duration /= divisions[i].amount;
    }
}
