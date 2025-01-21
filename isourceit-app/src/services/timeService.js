const DATE_FORMAT = new Intl.DateTimeFormat('fr-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit',
});

// const TIME_HR_FORMAT = new Intl.DateTimeFormat('fr-FR', {
//   hour: '2-digit', minute: '2-digit',
// });

const TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function formatDate(dateFormat, d) {
  if (!d) {
    return null;
  }
  try {
    return dateFormat.format(d);
  } catch (e) {
    console.warn(`Wrong date to format: ${d}`, e);
    return null;
  }
}

export function goodDateOrNull(d) {
  return (!d || !(d instanceof Date) || Number.isNaN(d.valueOf())) ? null : d;
}

export function dateToLocalDateString(d) {
  return formatDate(DATE_FORMAT, d);
}

export function dateToLocalTimeString(d) {
  return formatDate(TIME_FORMAT, d);
}

export function dateToLocalDateTimeString(d) {
  // return `${dateToLocalDateString(d)}T${dateToLocalTimeString(d)}`;
  return (d && d.toLocaleString) ? d.toLocaleString() : null;
}

export function dateTimeStringToDate(ldtStr) {
  if (!ldtStr) {
    return null;
  }
  return goodDateOrNull(new Date(ldtStr));
}

export function compareDatetime(a1, a2) {
  // Warning a1 === a2 will always return false, except if a1 and a2 are the same instance.
  if (a1 > a2) {
    return 1;
  }
  if (a1 < a2) {
    return -1;
  }
  return 0;
}

const SEC_IN_HOUR = 60 * 60;
const SEC_IN_MINUTE = 60;

export function formatSecondDuration(secondDuration) {
  let secondLeft = secondDuration;
  let str = '';

  const hours = Math.floor(secondLeft / SEC_IN_HOUR);
  secondLeft -= hours * SEC_IN_HOUR;
  if (hours) {
    str = `${hours} h. `;
  }

  const minutes = Math.floor(secondLeft / SEC_IN_MINUTE);
  secondLeft -= minutes * SEC_IN_MINUTE;
  if (minutes || hours) {
    str += `${minutes} m. `;
  }

  str += `${secondLeft} s.`;
  return str;
}
