import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    DollarSign,
    HelpCircle,
    Package,
    RefreshCw,
    Zap
} from 'lucide-react';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { autoRestockAPI } from '../services/api.jsx';
import { ScrollReveal } from './common';

import { useDarkMode } from '../contexts/ThemeContext';

export default function AutoRestock() {
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockAnalysis, setStockAnalysis] = useState(null);
  const [processingRestock, setProcessingRestock] = useState(false);

  const [restockingProduct, setRestockingProduct] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async() => {
    try {
      setLoading(true);
      setError(null);

      const response = await autoRestockAPI.getAnalysis();
      setStockAnalysis(response.data);
    } catch {
      setError('Failed to load auto-restock data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestockAll = async() => {
    try {
      setProcessingRestock(true);

      if (!stockAnalysis?.restock_items?.length) {
        setError('No items to restock');
        return;
      }

      const response = await autoRestockAPI.restockAll();
      setSuccessMessage(
        `Successfully restocked ${response.data.products_restocked} products worth $${response.data.total_value.toFixed(2)}`
      );
      setShowSuccess(true);
      fetchData(); // Refresh data
    } catch {
      setError('Failed to restock products. Please try again.');
    } finally {
      setProcessingRestock(false);
    }
  };

  const handleRestockProduct = async productId => {
    try {
      setRestockingProduct(productId);

      const response = await autoRestockAPI.restockProduct(productId);
      setSuccessMessage(response.data.message);
      setShowSuccess(true);
      fetchData(); // Refresh data
    } catch {
      setError('Failed to restock product. Please try again.');
    } finally {
      setRestockingProduct(null);
    }
  };

  const getUrgencyColor = urgency => {
    switch (urgency) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getUrgencyIcon = urgency => {
    switch (urgency) {
      case 'critical':
        return <AlertTriangle size={16} />;
      case 'high':
        return <Clock size={16} />;
      case 'medium':
        return <Package size={16} />;
      case 'low':
        return <CheckCircle size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}       <ScrollReveal direction="down" duration={0.5}>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {t('autoRestock.title')}
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="Refresh Data">
            <IconButton
              onClick={fetchData}
              sx={{
                background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
                color: 'white',
                '&:hover': { background: 'linear-gradient(45deg, #e55a2b, #e8851a)' }
              }}
            >
              <RefreshCw size={20} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Zap />}
            onClick={handleRestockAll}
            disabled={processingRestock || !stockAnalysis?.restock_items?.length}
            sx={{
              background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
              '&:hover': { background: 'linear-gradient(45deg, #e55a2b, #e8851a)' },
              '&:disabled': { background: 'rgba(0,0,0,0.12)' }
            }}
          >
            {processingRestock ? t('common.loading') : t('autoRestock.restockAll')}
          </Button>
        </Box>
      </Box>
       </ScrollReveal>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      {stockAnalysis && (
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <ScrollReveal direction="up" delay={0.1}>
            <Card
              sx={{
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                  : 'linear-gradient(135deg, #fff5f2 0%, #ffe8d6 100%)',
                border: darkMode
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(255,107,53,0.2)'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="error.main">
                      {stockAnalysis.critical_count}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                    >
                      {t('autoRestock.criticalItems')}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(211, 47, 47, 0.1)',
                      border: '1px solid rgba(211, 47, 47, 0.3)'
                    }}
                  >
                    <AlertTriangle size={24} color="#d32f2f" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
            </ScrollReveal>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <ScrollReveal direction="up" delay={0.2}>
            <Card
              sx={{
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                  : 'linear-gradient(135deg, #fff5f2 0%, #ffe8d6 100%)',
                border: darkMode
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(255,107,53,0.2)'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {stockAnalysis.high_count}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                    >
                      {t('autoRestock.highPriority')}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(237, 108, 2, 0.1)',
                      border: '1px solid rgba(237, 108, 2, 0.3)'
                    }}
                  >
                    <Clock size={24} color="#ed6c02" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
            </ScrollReveal>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <ScrollReveal direction="up" delay={0.3}>
            <Card
              sx={{
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                  : 'linear-gradient(135deg, #fff5f2 0%, #ffe8d6 100%)',
                border: darkMode
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(255,107,53,0.2)'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="info.main">
                      {stockAnalysis.medium_count}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                    >
                      Medium Priority
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(2, 136, 209, 0.1)',
                      border: '1px solid rgba(2, 136, 209, 0.3)'
                    }}
                  >
                    <Package size={24} color="#0288d1" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
            </ScrollReveal>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <ScrollReveal direction="up" delay={0.4}>
            <Card
              sx={{
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                  : 'linear-gradient(135deg, #fff5f2 0%, #ffe8d6 100%)',
                border: darkMode
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(255,107,53,0.2)'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {stockAnalysis.low_count || 0}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                    >
                      Low Priority
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(46, 125, 50, 0.1)',
                      border: '1px solid rgba(46, 125, 50, 0.3)'
                    }}
                  >
                    <CheckCircle size={24} color="#2e7d32" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
            </ScrollReveal>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <ScrollReveal direction="up" delay={0.5}>
            <Card
              sx={{
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                  : 'linear-gradient(135deg, #fff5f2 0%, #ffe8d6 100%)',
                border: darkMode
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(255,107,53,0.2)'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      ${stockAnalysis.total_cost?.toFixed(2) || '0.00'}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                    >
                      Total Cost
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(46, 125, 50, 0.1)',
                      border: '1px solid rgba(46, 125, 50, 0.3)'
                    }}
                  >
                    <DollarSign size={24} color="#2e7d32" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
            </ScrollReveal>
          </Grid>
        </Grid>
      )}

      {/* Restock Items Table */}
      {stockAnalysis?.restock_items?.length > 0 ? (
        <Card
          sx={{
            background: darkMode
              ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
              : 'linear-gradient(135deg, #fff5f2 0%, #ffe8d6 100%)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,107,53,0.2)'
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography
                variant="h6"
                fontWeight="600"
                sx={{ color: darkMode ? '#ffffff' : '#000000' }}
              >
                Items Needing Restock
              </Typography>
              <Tooltip title="This table shows products that need restocking. Critical items are out of stock, high priority items are below minimum stock, and medium priority items are below recommended levels.">
                <IconButton
                  size="small"
                  sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                >
                  <HelpCircle size={18} />
                </IconButton>
              </Tooltip>
            </Box>

            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ background: 'linear-gradient(45deg, #ff6b35, #f7931e)' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Current Stock</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Recommended</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                      Restock Needed
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cost</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Priority</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockAnalysis.restock_items.map(item => (
                    <TableRow
                      key={item.product.id}
                      sx={{
                        backgroundColor: darkMode
                          ? 'rgba(255,255,255,0.02)'
                          : 'rgba(255,255,255,0.5)',
                        '&:hover': {
                          background: darkMode
                            ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.05) 100%)'
                            : 'linear-gradient(135deg, #fff5f2 0%, #ffe8d6 100%)'
                        }
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography
                            variant="subtitle1"
                            fontWeight="600"
                            sx={{ color: darkMode ? '#ffffff' : '#000000' }}
                          >
                            {item.product.nome}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                          >
                            {item.product.codigo} • {item.product.categoria}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          sx={{ color: darkMode ? '#ffffff' : '#000000' }}
                        >
                          {item.restock_info.current_stock}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                        >
                          {item.restock_info.recommended_stock}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" color="error.main">
                          {item.restock_info.restock_needed}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" color="success.main">
                          ${item.restock_info.estimated_cost.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            item.restock_info.urgency.charAt(0).toUpperCase() +
                            item.restock_info.urgency.slice(1)
                          }
                          color={getUrgencyColor(item.restock_info.urgency)}
                          size="small"
                          icon={getUrgencyIcon(item.restock_info.urgency)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleRestockProduct(item.product.id)}
                          disabled={restockingProduct === item.product.id}
                          sx={{
                            borderColor: '#ff6b35',
                            color: '#ff6b35',
                            '&:hover': {
                              borderColor: '#e55a2b',
                              backgroundColor: 'rgba(255,107,53,0.1)'
                            }
                          }}
                        >
                          {restockingProduct === item.product.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            'Restock'
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        <Card
          sx={{
            background: darkMode
              ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
              : 'linear-gradient(135deg, #fff5f2 0%, #ffe8d6 100%)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,107,53,0.2)'
          }}
        >
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <CheckCircle size={64} color="#4caf50" />
              <Typography variant="h6" sx={{ mt: 2, color: darkMode ? '#ffffff' : '#000000' }}>
                All Products Are Well Stocked!
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  textAlign: 'center'
                }}
              >
                No products need restocking at the moment. Your inventory is in good shape.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

