import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  TextField,
  Grid,
  IconButton,
  Typography,
  Autocomplete,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SaveIcon from "@mui/icons-material/Save";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { updateStorySectionConfig } from "../services/serverApi.adminConfig";

function UpdateStoryConfigDialog({ open, onClose, onUpdate, storySectionConfig, token }) {
  const { t } = useTranslation("common");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const languages = [
    { id: "en", name: t("EN") },
    { id: "fr", name: t("FR") },
    { id: "ar", name: t("AR") },
  ];

  const initialValues = {
    storySection: {
      title: { en: "", fr: "", ar: "" },
      description: { en: "", fr: "", ar: "" },
      btn: { en: "", fr: "", ar: "" },
      btnUrl: "",
    },
    listings: [
      {
        id: `new-${Date.now()}`,
        imageUrl: "",
        title: { en: "", fr: "", ar: "" },
        linkText: { en: "", fr: "", ar: "" },
        linkUrl: "",
      },
      {
        id: `new-${Date.now() + 1}`,
        imageUrl: "",
        title: { en: "", fr: "", ar: "" },
        linkText: { en: "", fr: "", ar: "" },
        linkUrl: "",
      },
    ],
  };

  const validationSchema = Yup.object({
    storySection: Yup.object({
      title: Yup.object().test(
        "atLeastOneTitle",
        t("At least one title is required"),
        (obj) => Object.keys(obj).length > 0 && Object.values(obj).some((v) => v?.trim())
      ),
      description: Yup.object().test(
        "atLeastOneDescription",
        t("At least one description is required"),
        (obj) => Object.keys(obj).length > 0 && Object.values(obj).some((v) => v?.trim())
      ),
      btn: Yup.object().test(
        "atLeastOneBtn",
        t("At least one button text is required"),
        (obj) => Object.keys(obj).length > 0 && Object.values(obj).some((v) => v?.trim())
      ),
      btnUrl: Yup.string()
        .matches(
          /^(https?:\/\/[^\s/$.?#].[^\s]*|\/[^\s]*)?$/,
          t("Invalid URL (use http://, https://, or relative path like /stories)")
        )
        .notRequired(),
    }),
    listings: Yup.array().of(
      Yup.object({
        id: Yup.string().required(t("Listing ID is required")),
        imageUrl: Yup.string()
          .matches(
            /^(https?:\/\/[^\s/$.?#].[^\s]*|\/[^\s]*)?$/,
            t("Invalid URL (use http://, https://, or relative path like /images/story.jpg)")
          )
          .notRequired(),
        title: Yup.object().test(
          "atLeastOneTitle",
          t("At least one title is required"),
          (obj) => Object.keys(obj).length > 0 && Object.values(obj).some((v) => v?.trim())
        ),
        linkText: Yup.object().test(
          "atLeastOneLinkText",
          t("At least one link text is required"),
          (obj) => Object.keys(obj).length > 0 && Object.values(obj).some((v) => v?.trim())
        ),
        linkUrl: Yup.string()
          .matches(
            /^(https?:\/\/[^\s/$.?#].[^\s]*|\/[^\s]*)?$/,
            t("Invalid URL (use http://, https://, or relative path like /story/1)")
          )
          .notRequired(),
      })
    ),
  });

  const handleLanguageChange = (event, newValue) => {
    if (newValue) {
      setSelectedLanguage(newValue.id);
    }
  };

  const handleAddListing = (setFieldValue, values) => {
    setFieldValue("listings", [
      ...values.listings,
      {
        id: `new-${Date.now()}`,
        imageUrl: "",
        title: { en: "", fr: "", ar: "" },
        linkText: { en: "", fr: "", ar: "" },
        linkUrl: "",
      },
    ]);
  };

  const handleRemoveListing = (setFieldValue, values, index) => {
    setFieldValue(
      "listings",
      values.listings.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    const cleanPayload = {
      storySection: {
        title: values.storySection.title,
        description: values.storySection.description,
        btn: values.storySection.btn,
        btnUrl: values.storySection.btnUrl,
      },
      listings: values.listings.map(({ id, imageUrl, title, linkText, linkUrl }) => ({
        id,
        imageUrl,
        title,
        linkText,
        linkUrl,
      })),
    };
    try {
      const response = await updateStorySectionConfig(token, cleanPayload);
      if (response.message === "Story section config data updated" || response.storySectionConfig) {
        onUpdate(response.storySectionConfig);
        onClose();
        toast.success(t("StorySectionUpdatedSuccessfully"));
      } else {
        toast.error(response.message || t("FailedToUpdateStorySectionConfig"));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t("FailedToUpdateStorySectionConfig"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1300,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "600px",
          backgroundColor: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          zIndex: 1300,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        aria-labelledby="update-story-title"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px",
            borderBottom: "1px solid #d1d5db",
            backgroundColor: "#ffffff",
          }}
        >
          <h2
            id="update-story-title"
            style={{
              fontSize: "22px",
              fontWeight: 500,
              color: "#374151",
              margin: 0,
            }}
          >
            {t("UpdateStorySection")}
          </h2>
          <IconButton
            aria-label={t("Close dialog")}
            onClick={onClose}
            sx={{
              "&:hover": {
                backgroundColor: "#f3f4f6",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: "1.25rem" }} />
          </IconButton>
        </div>
        <Formik
          initialValues={storySectionConfig || initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue, isSubmitting, isValid }) => (
            <Box
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "16px",
                scrollbarWidth: "thin",
                scrollbarColor: "#00b4b4 #f1f1f1",
              }}
              sx={{
                "&::-webkit-scrollbar": { width: "8px" },
                "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
                "&::-webkit-scrollbar-thumb": { background: "#00b4b4", borderRadius: "4px" },
                "&::-webkit-scrollbar-thumb:hover": { background: "#009999" },
              }}
              aria-describedby={errors.storySection || errors.listings ? "error-message" : undefined}
            >
              <Form id="update-story-form">
                {(errors.storySection || errors.listings) && (
                  <Typography
                    id="error-message"
                    sx={{
                      color: "#EF4444",
                      fontSize: "14px",
                      fontWeight: 500,
                      textAlign: "center",
                      mb: "16px",
                      p: "16px",
                    }}
                  >
                    {errors.storySection?.title ||
                      errors.storySection?.description ||
                      errors.storySection?.btn ||
                      errors.storySection?.btnUrl ||
                      errors.listings?.[0]?.title ||
                      errors.listings?.[0]?.imageUrl ||
                      errors.listings?.[0]?.linkText ||
                      errors.listings?.[0]?.linkUrl ||
                      t("Please fix the errors below")}
                  </Typography>
                )}
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography
                      sx={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#374151",
                        mb: "8px",
                      }}
                    >
                      {t("Language")}
                    </Typography>
                    <Autocomplete
                      disablePortal
                      value={languages.find((lang) => lang.id === selectedLanguage) || null}
                      options={languages}
                      getOptionLabel={(option) => option.name}
                      onChange={handleLanguageChange}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label={t("Select Language")}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <div
                      style={{
                        border: "1px dashed #d1d5db",
                        padding: "16px",
                        marginBottom: "16px",
                        borderRadius: "8px",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#374151",
                          mb: "16px",
                          textAlign: "center",
                        }}
                      >
                        {t("Story Section")}
                      </Typography>
                      <Field
                        as={TextField}
                        fullWidth
                        label={t("Title")}
                        name={`storySection.title.${selectedLanguage}`}
                        value={values.storySection.title[selectedLanguage] || ""}
                        onChange={(e) => setFieldValue(`storySection.title.${selectedLanguage}`, e.target.value)}
                        error={touched.storySection?.title?.[selectedLanguage] && !!errors.storySection?.title}
                        helperText={touched.storySection?.title?.[selectedLanguage] && errors.storySection?.title}
                        size="small"
                        sx={{ mb: "8px" }}
                      />
                      <Field
                        as={TextField}
                        fullWidth
                        label={t("Description")}
                        name={`storySection.description.${selectedLanguage}`}
                        value={values.storySection.description[selectedLanguage] || ""}
                        onChange={(e) => setFieldValue(`storySection.description.${selectedLanguage}`, e.target.value)}
                        multiline
                        rows={4}
                        size="small"
                        error={touched.storySection?.description?.[selectedLanguage] && !!errors.storySection?.description}
                        helperText={touched.storySection?.description?.[selectedLanguage] && errors.storySection?.description}
                        sx={{ mb: "8px" }}
                      />
                      <Field
                        as={TextField}
                        fullWidth
                        label={t("ButtonText")}
                        name={`storySection.btn.${selectedLanguage}`}
                        value={values.storySection.btn[selectedLanguage] || ""}
                        onChange={(e) => setFieldValue(`storySection.btn.${selectedLanguage}`, e.target.value)}
                        error={touched.storySection?.btn?.[selectedLanguage] && !!errors.storySection?.btn}
                        helperText={touched.storySection?.btn?.[selectedLanguage] && errors.storySection?.btn}
                        size="small"
                        sx={{ mb: "8px" }}
                      />
                      <Field
                        as={TextField}
                        fullWidth
                        label={t("ButtonURL")}
                        name="storySection.btnUrl"
                        value={values.storySection.btnUrl || ""}
                        onChange={(e) => setFieldValue("storySection.btnUrl", e.target.value)}
                        error={touched.storySection?.btnUrl && !!errors.storySection?.btnUrl}
                        helperText={touched.storySection?.btnUrl && errors.storySection?.btnUrl}
                        size="small"
                      />
                    </div>
                  </Grid>
                  <Grid item xs={12}>
                    <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "16px" }} />
                  </Grid>
                  {values.listings.map((listing, index) => (
                    <React.Fragment key={listing.id}>
                      <Grid item xs={12}>
                        <div
                          style={{
                            border: "1px solid #e5e7eb",
                            padding: "16px",
                            marginBottom: "16px",
                            borderRadius: "8px",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "16px",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "#374151",
                                textAlign: "center",
                              }}
                            >
                              {t("Listing {number}", { number: index + 1 })}
                            </Typography>
                            <Button
                              variant="outlined"
                              onClick={() => handleRemoveListing(setFieldValue, values, index)}
                              sx={{
                                borderColor: "#d1d5db",
                                color: "#EF4444",
                                "&:hover": { borderColor: "#9ca3af", bgcolor: "#f9fafb" },
                                textTransform: "none",
                              }}
                            >
                              {t("Remove Listing")}
                            </Button>
                          </div>
                          <Field
                            as={TextField}
                            fullWidth
                            label={t("ListingTitle")}
                            name={`listings[${index}].title.${selectedLanguage}`}
                            value={listing.title[selectedLanguage] || ""}
                            onChange={(e) => setFieldValue(`listings[${index}].title.${selectedLanguage}`, e.target.value)}
                            error={touched.listings?.[index]?.title?.[selectedLanguage] && !!errors.listings?.[index]?.title}
                            helperText={touched.listings?.[index]?.title?.[selectedLanguage] && errors.listings?.[index]?.title}
                            size="small"
                            sx={{ mb: "8px" }}
                          />
                          <Field
                            as={TextField}
                            fullWidth
                            label={t("ImageURL")}
                            name={`listings[${index}].imageUrl`}
                            value={listing.imageUrl || ""}
                            onChange={(e) => setFieldValue(`listings[${index}].imageUrl`, e.target.value)}
                            error={touched.listings?.[index]?.imageUrl && !!errors.listings?.[index]?.imageUrl}
                            helperText={touched.listings?.[index]?.imageUrl && errors.listings?.[index]?.imageUrl}
                            size="small"
                            sx={{ mb: "8px" }}
                          />
                          <Field
                            as={TextField}
                            fullWidth
                            label={t("LinkText")}
                            name={`listings[${index}].linkText.${selectedLanguage}`}
                            value={listing.linkText[selectedLanguage] || ""}
                            onChange={(e) => setFieldValue(`listings[${index}].linkText.${selectedLanguage}`, e.target.value)}
                            error={touched.listings?.[index]?.linkText?.[selectedLanguage] && !!errors.listings?.[index]?.linkText}
                            helperText={touched.listings?.[index]?.linkText?.[selectedLanguage] && errors.listings?.[index]?.linkText}
                            size="small"
                            sx={{ mb: "8px" }}
                          />
                          <Field
                            as={TextField}
                            fullWidth
                            label={t("LinkURL")}
                            name={`listings[${index}].linkUrl`}
                            value={listing.linkUrl || ""}
                            onChange={(e) => setFieldValue(`listings[${index}].linkUrl`, e.target.value)}
                            error={touched.listings?.[index]?.linkUrl && !!errors.listings?.[index]?.linkUrl}
                            helperText={touched.listings?.[index]?.linkUrl && errors.listings?.[index]?.linkUrl}
                            size="small"
                          />
                        </div>
                      </Grid>
                      <Grid item xs={12}>
                        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "16px" }} />
                      </Grid>
                    </React.Fragment>
                  ))}
                  <Grid item xs={12}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Button
                        variant="outlined"
                        onClick={() => handleAddListing(setFieldValue, values)}
                        sx={{
                          borderColor: "#d1d5db",
                          color: "#00b4b4",
                          "&:hover": { borderColor: "#9ca3af", bgcolor: "#f9fafb" },
                          textTransform: "none",
                        }}
                      >
                        <AddCircleOutlineIcon sx={{ color: "#00b4b4" }} />
                        {t("Add Listing")}
                      </Button>
                    </div>
                  </Grid>
                </Grid>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "16px",
                    borderTop: "1px solid #e5e7eb",
                    backgroundColor: "#ffffff",
                    paddingBottom: "20px",
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={onClose}
                    disabled={isSubmitting}
                    sx={{
                      flex: 1,
                      borderColor: "#d1d5db",
                      color: "#6b7280",
                      "&:hover": { borderColor: "#9ca3af", backgroundColor: "#f9fafb" },
                      "&:disabled": { borderColor: "#e5e7eb", color: "#9ca3af" },
                      textTransform: "none",
                    }}
                    startIcon={<CloseIcon sx={{ color: "#6b7280" }} />}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    variant="contained"
                    disabled={isSubmitting || !isValid}
                    sx={{
                      flex: 1,
                      backgroundColor: "#00b4b4 !important",
                      color: "#ffffff !important",
                      "&:hover": { backgroundColor: "#009999 !important" },
                      "&:disabled": { backgroundColor: "#e5e7eb !important", color: "#9ca3af !important" },
                      textTransform: "none",
                    }}
                    startIcon={<SaveIcon sx={{ color: "#ffffff" }} />}
                    onClick={() => document.getElementById("update-story-form").requestSubmit()}
                  >
                    {t("Save Changes")}
                  </Button>
                </div>
              </Form>
            </Box>
          )}
        </Formik>
      </div>
    </>
  );
}

export default UpdateStoryConfigDialog;