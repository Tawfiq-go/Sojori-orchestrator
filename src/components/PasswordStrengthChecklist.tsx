import { Box, Typography } from '@mui/material';
import { PASSWORD_RULES } from '../utils/passwordPolicy';

type PasswordStrengthChecklistProps = {
  password: string;
};

export default function PasswordStrengthChecklist({ password }: PasswordStrengthChecklistProps) {
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.25, color: 'text.secondary' }}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <Typography
            key={rule.id}
            component="li"
            variant="caption"
            sx={{ color: ok ? 'success.main' : 'text.secondary', lineHeight: 1.6 }}
          >
            {ok ? '✓' : '○'} {rule.label}
          </Typography>
        );
      })}
    </Box>
  );
}
