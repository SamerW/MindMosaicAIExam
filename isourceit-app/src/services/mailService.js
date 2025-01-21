export function forgeMailLink(address, {
  recipient = null, subject = null, body = null,
}) {
  if (!address) {
    return null;
  }
  let link = 'mailto:';
  if (recipient) {
    link += `${encodeURI(recipient)}<${address}>`;
  } else {
    link += address;
  }
  let separator = '?';
  if (subject) {
    link += `${separator}subject=${encodeURI(subject)}`;
    separator = '&';
  }
  if (body) {
    link += `${separator}body=${encodeURI(body)}`;
  }
  return link;
}

export function openMail(address, {
  recipient = null, subject = null, body = null,
}) {
  const link = forgeMailLink(address, { recipient, subject, body });
  if (!link) {
    console.warn('Cannot open mail: missing information');
    return;
  }
  window.location.href = link;
}

export default { forgeMailLink, openMail };
