import { alpha, createTheme } from "@mui/material/styles";

export const guesthouseTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f3557"
    },
    secondary: {
      main: "#d26749"
    },
    background: {
      default: "#f6efe5",
      paper: "#ffffff"
    },
    success: {
      main: "#3a7d5e"
    },
    warning: {
      main: "#c5892f"
    },
    text: {
      primary: "#162534",
      secondary: "#58687b"
    }
  },
  shape: {
    borderRadius: 20
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontWeight: 600
    },
    h2: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontWeight: 600
    },
    h3: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontWeight: 600
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
          textTransform: "none",
          fontWeight: 700
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: "0 24px 80px rgba(15, 53, 87, 0.12)",
          border: `1px solid ${alpha("#0f3557", 0.08)}`
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999
        }
      }
    }
  }
});

