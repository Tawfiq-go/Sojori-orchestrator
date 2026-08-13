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
          const id = String(owner._id ?? owner.id ?? '');
          const ruEmail = resolveRuEmailDisplay(owner);
          const ruId = owner.ruOwnerId ? String(owner.ruOwnerId).trim() : '';
          const name = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Owner';
          // Deux PM peuvent avoir le même nom (ex. Nommos) → email + RU# obligatoires.
          const parts = [name];
          if (owner.email) parts.push(String(owner.email));
          if (ruEmail && ruEmail !== owner.email) parts.push(`RU ${ruEmail}`);
          if (ruId) parts.push(`#${ruId}`);
          return (
            <option key={id} value={id}>
              {parts.join(' · ')}
            </option>
          );
        })}
      </select>
      {/* Bloc emails (dashboard / R.U. extranet) retiré : information technique
          sans usage pour l'opérateur, elle mangeait de la hauteur au-dessus du
          widget. Les emails restent visibles dans les options du sélecteur. */}
    </div>
  );
};

export default OwnerSelectorV2;
