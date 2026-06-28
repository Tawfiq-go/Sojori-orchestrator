import { useEffect, useState } from 'react';
import { getPmLogoUrl } from '../utils/pmProfileMediaUtils';

export function OwnerPmLogoImage({ images, className, emptyLabel = '?' }) {
  const url = getPmLogoUrl(images);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [url]);

  if (!url) {
    return <div className={`${className} owner-pm-logo-empty`}>{emptyLabel}</div>;
  }

  if (broken) {
    return (
      <div className={`${className} owner-pm-logo-empty owner-pm-logo-broken`} title={url}>
        Logo illisible
      </div>
    );
  }

  return (
    <img
      className={className}
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

export default OwnerPmLogoImage;
