/** Cellules tableau — Owner · Listing Sojori · Sojori # */
import type { BusinessRowContext } from '../../utils/businessRowContext';

type Props = BusinessRowContext & {
  ownerTitle?: string;
  listingTitle?: string;
};

export function BusinessContextCells({ ownerLabel, listingLabel, sojoriReservationNumber, ownerTitle, listingTitle }: Props) {
  return (
    <>
      <td className="px-2 py-2 text-xs truncate max-w-[130px]" title={ownerTitle || ownerLabel}>
        {ownerLabel}
      </td>
      <td className="px-2 py-2 text-xs truncate max-w-[160px]" title={listingTitle || listingLabel}>
        {listingLabel}
      </td>
      <td className="px-2 py-2 text-xs font-mono whitespace-nowrap">{sojoriReservationNumber}</td>
    </>
  );
}
