import { tokens as T } from '../../../components/dashboard/DashboardV2.components';
import { resolveRuEmailDisplay } from '../../staff/utils/ruEmailUtils';

const selectStyle = {
  width: '100%',
  padding: '11px 14px',
  fontSize: 14,
  fontWeight: 500,
  color: T.text,
  background: T.bg1,
  border: `1px solid ${T.borderStrong}`,
  borderRadius: 10,
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2355504a' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 40,
};

const OwnerSelectorV2 = ({
  owners,
  selectedOwnerId,
  onOwnerChange,
  title = 'Compte property manager',
  subtitle,
}) => {
  const selectedOwner = owners.find(
    (owner) => String(owner._id ?? owner.id) === String(selectedOwnerId),
  );
  const selectedRuEmail = selectedOwner ? resolveRuEmailDisplay(selectedOwner) : '';

  return (
    <div>
      <label
        htmlFor="owner-select"
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 700,
          color: T.text2,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 8,
        }}
      >
        {title}
      </label>
      {subtitle && (
        <p style={{ margin: '0 0 10px', fontSize: 12, color: T.text3 }}>{subtitle}</p>
      )}
      <select
        id="owner-select"
        style={selectStyle}
        value={selectedOwnerId}
        onChange={onOwnerChange}
      >
        <option disabled value="">
          Choisir un owner…
        </option>
        {owners.map((owner) => {
          const ruEmail = resolveRuEmailDisplay(owner);
          return (
            <option key={owner._id} value={owner._id}>
              {owner.firstName} {owner.lastName}
              {owner.email ? ` — dashboard: ${owner.email}` : ''}
              {ruEmail && ruEmail !== owner.email ? ` · RU: ${ruEmail}` : ''}
            </option>
          );
        })}
      </select>
      {selectedOwner && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            background: T.bg2,
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            fontSize: 12,
            lineHeight: 1.55,
            color: T.text2,
          }}
        >
          <div>
            <strong style={{ color: T.text }}>Email dashboard :</strong>{' '}
            {selectedOwner.email || '—'}
          </div>
          <div>
            <strong style={{ color: T.text }}>Email R.U. (extranet) :</strong>{' '}
            {selectedRuEmail || '—'}
          </div>
          <div style={{ marginTop: 4, color: T.text3 }}>
            Le widget Channel Manager se connecte avec l’email R.U.
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerSelectorV2;
