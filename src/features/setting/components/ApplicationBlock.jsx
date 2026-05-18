import React, { useState, Component } from "react";
import { useTranslation } from "react-i18next";
import AppsIcon from "@mui/icons-material/Apps";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SaveIcon from "@mui/icons-material/Save";
import { Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import MDBox from "components/MDBox";
class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null
  };
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  render() {
    if (this.state.hasError) {
      return <Box sx={{
        p: 3,
        color: "red"
      }}>
          <Typography variant="h6">Error in ApplicationBlock</Typography>
          <Typography>{this.state.error?.message || "Unknown error"}</Typography>
        </Box>;
    }
    return this.props.children;
  }
}
function ApplicationBlock() {
  const {
    t
  } = useTranslation("common");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const handleSave = () => {};
  return <DashboardLayout>
      <ErrorBoundary>
        <Box sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        bgcolor: "white",
        px: "11%",
        py: "2%"
      }}>
          <MDBox py={3} className="!bg-white py-0">
            <Container maxWidth={false} sx={{
            maxWidth: 1423,
            px: 0
          }}>
              <Stack spacing={7} sx={{
              py: 7
            }}>
                <Paper elevation={1} sx={{
                maxWidth: 976,
                width: "100%",
                mx: "auto",
                border: 1,
                borderColor: "grey.200",
                borderRadius: 2,
                overflow: "hidden"
              }}>
                  {/* Header */}
                  <Box sx={{
                  background: "linear-gradient(90deg, rgba(18,161,144,0.1) 0%, rgba(18,161,144,0) 50%, rgba(18,161,144,0) 100%)",
                  borderBottom: 1,
                  borderColor: "grey.200",
                  p: 3
                }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AppsIcon sx={{
                      fontSize: 16,
                      color: "white"
                    }} /> 
                      <Typography variant="h6" sx={{
                      fontWeight: 600,
                      fontSize: 17,
                      letterSpacing: "-0.45px",
                      color: "#131a20"
                    }}>
                        Application Editor
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Body */}
                  <Box sx={{
                  p: 3
                }}>
                    <Stack direction="row" spacing={4}>
                      {/* Left side form */}
                      <Stack spacing={2} sx={{
                      flex: 1
                    }}>
                        <Box>
                          <Typography variant="body2" sx={{
                          fontWeight: 500,
                          fontSize: 13,
                          color: "#131a20",
                          mb: 0.5
                        }}>
                            Title
                          </Typography>
                          <TextField fullWidth placeholder="App headline" value={title} onChange={e => setTitle(e.target.value)} size="small" sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13.2,
                            color: "grey.400"
                          }
                        }} />
                        </Box>

                        <Box>
                          <Typography variant="body2" sx={{
                          fontWeight: 500,
                          fontSize: 13.2,
                          color: "#131a20",
                          mb: 0.5
                        }}>
                            Description
                          </Typography>
                          <TextField fullWidth multiline rows={4} placeholder="Describe the app" value={description} onChange={e => setDescription(e.target.value)} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 12.9,
                            color: "grey.400"
                          }
                        }} />
                        </Box>

                        <Box sx={{
                        pt: 1
                      }}>
                          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={{
                          bgcolor: "#12a190",
                          color: "white !important",
                          "&:hover": {
                            bgcolor: "#0f8a7a"
                          },
                          fontSize: 12.7,
                          fontWeight: 500,
                          textTransform: "none",
                          px: 2,
                          py: 1
                        }}>
                            Save
                          </Button>
                        </Box>
                      </Stack>

                      {/* Right side upload */}
                      <Stack spacing={2} sx={{
                      flex: 1
                    }}>
                        <Box>
                          <Typography variant="body2" sx={{
                          fontWeight: 500,
                          fontSize: 13.6,
                          color: "#131a20"
                        }}>
                            Image
                          </Typography>
                          <Typography variant="caption" sx={{
                          fontSize: 10.9,
                          color: "grey.500"
                        }}>
                            PNG/JPG
                          </Typography>
                        </Box>

                        <Paper variant="outlined" sx={{
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "grey.50",
                        border: "2px dashed",
                        borderColor: "grey.300",
                        cursor: "pointer",
                        "&:hover": {
                          borderColor: "grey.400"
                        }
                      }}>
                          <CloudUploadIcon sx={{
                          fontSize: 48,
                          color: "grey.400"
                        }} />
                        </Paper>
                      </Stack>
                    </Stack>
                  </Box>
                </Paper>
              </Stack>
            </Container>
          </MDBox>
        </Box>
      </ErrorBoundary>
    </DashboardLayout>;
}
export default ApplicationBlock;
