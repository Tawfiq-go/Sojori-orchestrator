import { tokens as T } from '../../../components/dashboard/DashboardV2.components';

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
        {owners.map((owner) => (
          <option key={owner._id} value={owner._id}>
            {owner.firstName} {owner.lastName}
            {owner.email ? ` — ${owner.email}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default OwnerSelectorV2;
