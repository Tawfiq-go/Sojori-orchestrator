import { useEffect, useState } from 'react';

/** Active le chargement lourd (ex. picker listings) quand la section entre dans le viewport. */
export function useSectionInView(sectionId: string, rootMargin = '200px 0px') {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = document.getElementById(sectionId);
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionId, inView, rootMargin]);

  return inView;
}
