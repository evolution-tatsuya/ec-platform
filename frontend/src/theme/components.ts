import type { Components, Theme } from '@mui/material/styles';

/**
 * MUIコンポーネントのグローバルスタイルオーバーライド
 * ECサイトに最適化されたコンポーネント設定
 */
export const components: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '10px 24px',
        fontSize: '0.875rem',
        fontWeight: 500,
        boxShadow: 'none',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0px 4px 12px rgba(124, 77, 255, 0.3)',
          transform: 'translateY(-1px)',
        },
      },
      contained: {
        '&:hover': {
          boxShadow: '0px 4px 12px rgba(124, 77, 255, 0.3)',
        },
      },
      outlined: {
        borderWidth: 2,
        '&:hover': {
          borderWidth: 2,
        },
      },
      sizeLarge: {
        padding: '12px 32px',
        fontSize: '1rem',
      },
      sizeSmall: {
        padding: '6px 16px',
        fontSize: '0.75rem',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          '&:hover fieldset': {
            borderColor: '#7c4dff',
          },
          '&.Mui-focused fieldset': {
            borderWidth: 2,
          },
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
          transform: 'translateY(-2px)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12,
      },
      elevation1: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.08)',
      },
      elevation2: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08)',
      },
      elevation3: {
        boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 500,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: 0,
        borderRight: '1px solid rgba(0, 0, 0, 0.12)',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        padding: '16px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
      },
      head: {
        fontWeight: 600,
        backgroundColor: '#f5f5f5',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.875rem',
        minHeight: 48,
      },
    },
  },
  MuiAutocomplete: {
    styleOverrides: {
      paper: {
        borderRadius: 8,
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
      },
      option: {
        '&[aria-selected="true"]': {
          backgroundColor: 'rgba(124, 77, 255, 0.08)',
        },
        '&:hover': {
          backgroundColor: 'rgba(124, 77, 255, 0.04)',
        },
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      select: {
        borderRadius: 8,
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: {
        padding: 8,
      },
      switchBase: {
        '&.Mui-checked': {
          color: '#7c4dff',
          '& + .MuiSwitch-track': {
            backgroundColor: '#7c4dff',
          },
        },
      },
    },
  },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        '&.Mui-checked': {
          color: '#7c4dff',
        },
      },
    },
  },
  MuiRadio: {
    styleOverrides: {
      root: {
        '&.Mui-checked': {
          color: '#7c4dff',
        },
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        height: 8,
      },
      bar: {
        borderRadius: 4,
      },
    },
  },
  MuiCircularProgress: {
    styleOverrides: {
      root: {
        color: '#7c4dff',
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontWeight: 600,
        fontSize: '0.625rem',
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 6,
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: 'rgba(0, 0, 0, 0.87)',
      },
    },
  },
};
