import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, CircularProgress, Paper, TextField, IconButton, Chip } from '@mui/material';
import { Psychology as AiIcon, Close as CloseIcon, Send as SendIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { configureOrchestratorWithAI } from '../services/serverApi.adminConfig';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0'
};
const OrchestratorAIWizard = ({
  open,
  onClose,
  onConfigured,
  ownerId
}) => {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const questions = [{
    id: 'propertyCount',
    text: "Combien de biens gérez-vous ?",
    options: ['1-5 biens', '6-20 biens', '20+ biens']
  }, {
    id: 'staffMode',
    text: "Travaillez-vous avec une équipe ou seul ?",
    options: ['Multi-staff (équipe)', 'Solo (je gère seul)']
  }, {
    id: 'taskCreationPriority',
    text: "Quand voulez-vous créer les tâches ?",
    options: ['Dès que possible (anticipation)', 'Dernier moment (juste à temps)', 'Modéré (équilibré)']
  }, {
    id: 'adminNotifications',
    text: "Comment notifier Admin ?",
    options: ['Toujours (tout notifier)', 'Modéré (important uniquement)', 'Faible (urgences)']
  }, {
    id: 'lastMinuteSituation',
    text: "Situation de dernière minute (staff introuvable) ?",
    options: ['Assigner Admin', 'Annuler la tâche', 'Continuer toujours la recherche']
  }, {
    id: 'clientNotifications',
    text: "À quelle fréquence notifier les clients ?",
    options: ['Toujours (suivi complet)', 'Modéré (moments clés)', 'Faible (minimum requis)']
  }];

  // Reset wizard when modal opens
  useEffect(() => {
    if (open) {
      const initialMessages = [{
        type: 'ai',
        text: "👋 Bonjour ! Je vais configurer l'orchestration complète de vos catégories (réservation → avis client) avec 6 questions rapides."
      }, {
        type: 'ai',
        text: `**Question 1/${questions.length}** : ${questions[0].text}`,
        options: questions[0].options
      }];
      setMessages(initialMessages);
      setCurrentQuestion(1);
      setAnswers({});
      setIsProcessing(false);
      setShowSummary(false);
    }
  }, [open]);
  const handleOptionClick = async (option, questionId) => {
    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      text: option
    }]);

    // Save answer
    const newAnswers = {
      ...answers,
      [questionId]: option
    };
    setAnswers(newAnswers);

    // Check if we have more questions
    if (currentQuestion < questions.length) {
      // Next question
      setTimeout(() => {
        const nextQuestion = questions[currentQuestion];
        setMessages(prev => [...prev, {
          type: 'ai',
          text: `**Question ${currentQuestion + 1}/${questions.length}** : ${nextQuestion.text}`,
          options: nextQuestion.options
        }]);
        setCurrentQuestion(currentQuestion + 1);
      }, 500);
    } else {
      // All questions answered - show summary!
      setTimeout(() => {
        showConfigurationSummary(newAnswers);
      }, 500);
    }
  };
  const showConfigurationSummary = finalAnswers => {
    setShowSummary(true);
    const summaryText = `✅ **Résumé de votre configuration**

📊 **Vos choix** :
• Nombre de biens : **${finalAnswers.propertyCount}**
• Mode de travail : **${finalAnswers.staffMode}**
• Création des tâches : **${finalAnswers.taskCreationPriority}**
• Notifications admin : **${finalAnswers.adminNotifications}**
• Situation dernière minute : **${finalAnswers.lastMinuteSituation}**
• Notifications client : **${finalAnswers.clientNotifications}**

🤖 L'IA va configurer intelligemment **toutes vos catégories de messages** (orchestrées + notification-only) selon ces préférences.

Cliquez sur **"Appliquer la configuration"** pour valider.`;
    setMessages(prev => [...prev, {
      type: 'ai',
      text: summaryText,
      showApplyButton: true
    }]);
  };
  const handleApplyConfiguration = async () => {
    await configureOrchestrator(answers);
  };
  const configureOrchestrator = async finalAnswers => {
    setIsProcessing(true);
    setMessages(prev => [...prev, {
      type: 'ai',
      text: "✨ Parfait ! Je configure votre orchestration maintenant...",
      showLoading: true
    }]);
    try {
      const response = await configureOrchestratorWithAI(finalAnswers, ownerId);

      // Extract response data
      const data = response?.data || response;
      const templatesConfigured = data?.templatesConfigured || 0;
      const templatesUpdated = data?.templatesUpdated || 0;
      const templatesCreated = data?.templatesCreated || 0;
      const ownerId = data?.ownerId;
      setMessages(prev => [...prev, {
        type: 'ai',
        text: `✅ Configuration terminée avec succès !\n\n📊 **Résumé** :\n- **${templatesConfigured} catégories** configurées intelligemment\n  • ${templatesUpdated} mises à jour\n  • ${templatesCreated} créées\n- Owner ID : ${ownerId}\n- Nombre de biens : ${finalAnswers.propertyCount}\n- Mode : ${finalAnswers.staffMode}\n- Notifications client : ${finalAnswers.clientNotifications}\n\nVous pouvez maintenant voir et modifier vos catégories dans l'onglet Orchestrator ! 🎉`
      }]);
      toast.success(`${templatesConfigured} catégories configurées (${templatesUpdated} modifiées, ${templatesCreated} créées) !`);
      setTimeout(() => {
        onConfigured();
        onClose();
      }, 2000);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'ai',
        text: `❌ Erreur lors de la configuration.\n\n${error.response?.data?.message || error.message || 'Erreur inconnue'}\n\nVeuillez réessayer ou contacter le support.`
      }]);
      toast.error('Erreur lors de la configuration');
    } finally {
      setIsProcessing(false);
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableEnforceFocus disableRestoreFocus PaperProps={{
    sx: {
      borderRadius: 2,
      maxHeight: '80vh'
    }
  }}>
      <DialogTitle sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      borderBottom: '1px solid #e0e0e0',
      pb: 2
    }}>
        <AiIcon sx={{
        color: SOJORI_COLORS.primary
      }} />
        <Typography variant="h6" sx={{
        flex: 1
      }}>
          Assistant IA - Configuration Orchestrator
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{
      p: 3,
      minHeight: '400px',
      maxHeight: '60vh',
      overflowY: 'auto'
    }}>
        {messages.length === 0 && <Typography>Chargement...</Typography>}
        <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
          {messages.map((message, index) => <Box key={index} sx={{
          display: 'flex',
          justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
          mb: 1
        }}>
              <Paper elevation={1} sx={{
            p: 2,
            maxWidth: '85%',
            backgroundColor: message.type === 'user' ? SOJORI_COLORS.primary : '#f5f5f5',
            color: message.type === 'user' ? 'white' : 'black'
          }}>
                <Typography variant="body1" sx={{
              whiteSpace: 'pre-line'
            }} dangerouslySetInnerHTML={{
              __html: message.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            }} />

                {message.options && <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              mt: 2
            }}>
                    {message.options.map((option, optionIndex) => <Button key={optionIndex} variant="outlined" onClick={() => handleOptionClick(option, questions[currentQuestion - 1].id)} disabled={isProcessing} sx={{
                borderColor: SOJORI_COLORS.primary,
                color: SOJORI_COLORS.primary,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: SOJORI_COLORS.primaryPale,
                  borderColor: SOJORI_COLORS.primaryDark
                }
              }}>
                        {option}
                      </Button>)}
                  </Box>}

                {message.showApplyButton && <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 2
            }}>
                    <Button variant="contained" onClick={handleApplyConfiguration} disabled={isProcessing} sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                '&:hover': {
                  backgroundColor: SOJORI_COLORS.primaryDark
                }
              }}>
                      ✨ Appliquer la configuration
                    </Button>
                  </Box>}

                {message.showLoading && <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mt: 2,
              gap: 2
            }}>
                    <CircularProgress sx={{
                color: SOJORI_COLORS.primary
              }} size={24} />
                    <Typography variant="body2" sx={{
                fontStyle: 'italic',
                color: '#666'
              }}>
                      L&apos;IA analyse vos réponses et configure vos catégories...
                    </Typography>
                  </Box>}
              </Paper>
            </Box>)}

          {isProcessing && <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          mt: 2
        }}>
              <CircularProgress sx={{
            color: SOJORI_COLORS.primary
          }} size={30} />
            </Box>}
        </Box>
      </DialogContent>
    </Dialog>;
};
export default OrchestratorAIWizard;
