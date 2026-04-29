import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import {
    AlertTriangle,
    Brain,
    Edit,
    HelpCircle,
    MessageCircle,
    MinusCircle,
    Package,
    Plus,
    PlusCircle,
    RotateCcw,
    Search,
    Trash2,
    TrendingUp
} from 'lucide-react';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { productsAPI, stockAPI, suppliersAPI } from '../services/api.jsx';
import { TableSkeleton } from './common/Skeletons';
import { ScrollReveal } from './common';

import { useDarkMode } from '../contexts/ThemeContext';

export default function Products() {
  const { darkMode } = useDarkMode();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: '',
    quantidade: 0,
    preco: 0,
    descricao: '',
    fornecedor_id: '',
    estoque_minimo: 5,
    lead_time_days: 7,
    safety_stock: 2
  });
  const [adjustingStock, setAdjustingStock] = useState(new Set());

  useEffect(() => {
    fetchData();

    // Listen for product data changes from other components
    const handleProductsDataChanged = () => {
      // Refresh products data to stay synchronized
      fetchData();
    };

    window.addEventListener('productsDataChanged', handleProductsDataChanged);

    // Cleanup event listener
    return () => {
      window.removeEventListener('productsDataChanged', handleProductsDataChanged);
    };
  }, []);

  const fetchData = async() => {
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        productsAPI.getAll(),
        suppliersAPI.getAll()
      ]);
      setProducts(productsRes.data);
      setSuppliers(suppliersRes.data);
      setLoading(false);
    } catch {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        codigo: product.codigo,
        nome: product.nome,
        categoria: product.categoria || '',
        quantidade: product.quantidade,
        preco: product.preco,
        descricao: product.descricao || '',
        fornecedor_id: product.fornecedor_id || '',
        estoque_minimo: product.estoque_minimo,
        lead_time_days: product.lead_time_days || 7,
        safety_stock: product.safety_stock || 2
      });
    } else {
      setEditingProduct(null);
      setFormData({
        codigo: '',
        nome: '',
        categoria: '',
        quantidade: 0,
        preco: 0,
        descricao: '',
        fornecedor_id: '',
        estoque_minimo: 5,
        lead_time_days: 7,
        safety_stock: 2
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async() => {
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
      } else {
        await productsAPI.create(formData);
      }
      setOpenDialog(false);
      fetchData();

      // Trigger global refresh for other components
      window.dispatchEvent(
        new CustomEvent('productsDataChanged', {
          detail: {
            action: editingProduct ? 'productUpdate' : 'productCreate',
            productId: editingProduct?.id
          }
        })
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleDelete = async productId => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsAPI.delete(productId);
        fetchData();

        // Trigger global refresh for other components
        window.dispatchEvent(
          new CustomEvent('productsDataChanged', {
            detail: {
              action: 'productDelete',
              productId
            }
          })
        );
      } catch {
        setError('Failed to delete product');
      }
    }
  };

  const handleMLAnalysis = product => {
    // Dispatch event to notify Insights component
    window.dispatchEvent(
      new CustomEvent('productSelectedForML', {
        detail: { product }
      })
    );
  };

  const handleQuickStockAdjust = async(productId, adjustment) => {
    try {
      setAdjustingStock(prev => new Set(prev).add(productId));
      const product = products.find(p => p.id === productId);
      if (!product) {
return;
}

      const newQuantity = Math.max(0, product.quantidade + adjustment);
      const reason = adjustment > 0 ? 'Quick stock addition' : 'Quick stock removal';

      await stockAPI.setStock(productId, { quantidade: newQuantity, motivo: reason });
      await fetchData(); // Refresh data after successful adjustment

      // Trigger global refresh for other components
      window.dispatchEvent(
        new CustomEvent('productsDataChanged', {
          detail: {
            productId,
            newStock: newQuantity,
            action: 'stockAdjustment',
            adjustment
          }
        })
      );
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to adjust stock';
      setError(`Stock adjustment failed: ${errorMessage}`);
    } finally {
      setAdjustingStock(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleContactSupplier = product => {
    const supplier = suppliers.find(s => s.id === product.fornecedor_id);
    if (!supplier) {
      alert('No supplier information available for this product.');
      return;
    }

    // Create WhatsApp message
    const message = `Hello! I'm interested in ordering more ${product.nome} (Code: ${product.codigo}). Could you please provide pricing and availability?`;
    const encodedMessage = encodeURIComponent(message);

    // Default phone number (you can replace with actual supplier phone)
    const phoneNumber = supplier.telefone || '5511999999999';

    // Open WhatsApp
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const getSupplierName = supplierId => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.nome : 'N/A';
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.categoria === filterCategory;
    const matchesSupplier = !filterSupplier || product.fornecedor_id === parseInt(filterSupplier);
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  // Sort products by stock priority: Red (0) -> Yellow (low) -> Green (good)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // Define stock status priority: 0 = red (highest priority), 1 = yellow, 2 = green
    const getStockPriority = (product) => {
      if (product.quantidade === 0) {
return 0;
} // Red - highest priority
      if (product.quantidade <= product.estoque_minimo) {
return 1;
} // Yellow - medium priority
      return 2; // Green - lowest priority
    };

    const priorityA = getStockPriority(a);
    const priorityB = getStockPriority(b);

    // If same priority, sort by stock quantity (ascending)
    if (priorityA === priorityB) {
      return a.quantidade - b.quantidade;
    }

    // Sort by priority (red first, then yellow, then green)
    return priorityA - priorityB;
  });

  const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))];

  if (loading) {
    return <TableSkeleton rows={8} />;
  }

  return (
    <Box>
      {/* Header */}
      <ScrollReveal direction="down" duration={0.5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {t('products.title')}
          </Typography>
          <Box display="flex" gap={2}>
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={fetchData}
                sx={{
                  background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                  color: 'white',
                  '&:hover': { background: 'linear-gradient(45deg, #1565c0, #1976d2)' }
                }}
              >
                <RotateCcw size={20} />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Plus />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                '&:hover': { background: 'linear-gradient(45deg, #1565c0, #1976d2)' }
              }}
            >
              {t('products.addProduct')}
            </Button>
          </Box>
        </Box>
      </ScrollReveal>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card
        sx={{
          mb: 3,
          background: darkMode
            ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
            : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          backdropFilter: 'blur(10px)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: darkMode
              ? '0 4px 20px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(139, 92, 246, 0.1)'
              : '0 4px 20px rgba(139, 92, 246, 0.1), 0 0 0 1px rgba(139, 92, 246, 0.05)'
          }
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography
              variant="h6"
              fontWeight="600"
              sx={{ color: darkMode ? '#ffffff' : '#000000' }}
            >
              Search & Filters
            </Typography>
            <Tooltip title="Use the search bar to find products by name or code. Use category and supplier filters to narrow down results. Quick stock adjustments can be made directly in the table.">
              <IconButton
                size="small"
                sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
              >
                <HelpCircle size={18} />
              </IconButton>
            </Tooltip>
          </Box>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Search
                      size={20}
                      style={{
                        marginRight: 8,
                        color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                      }}
                    />
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode
                      ? '1px solid rgba(255,255,255,0.1)'
                      : '1px solid rgba(0,0,0,0.1)',
                    '&:hover': {
                      backgroundColor: darkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.9)',
                      border: darkMode
                        ? '1px solid rgba(255,255,255,0.2)'
                        : '1px solid rgba(0,0,0,0.2)'
                    },
                    '&.Mui-focused': {
                      backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,1)',
                      border: darkMode
                        ? '1px solid rgba(139, 92, 246, 0.5)'
                        : '1px solid rgba(139, 92, 246, 0.3)'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                  },
                  '& .MuiInputBase-input': {
                    color: darkMode ? '#ffffff' : '#000000',
                    '&::placeholder': {
                      color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
                    }
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                  {t('products.category')}
                </InputLabel>
                <Select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  sx={{
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode
                      ? '1px solid rgba(255,255,255,0.1)'
                      : '1px solid rgba(0,0,0,0.1)',
                    '&:hover': {
                      backgroundColor: darkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.9)',
                      border: darkMode
                        ? '1px solid rgba(255,255,255,0.2)'
                        : '1px solid rgba(0,0,0,0.2)'
                    },
                    '& .MuiSelect-select': {
                      color: darkMode ? '#ffffff' : '#000000'
                    },
                    '& .MuiSvgIcon-root': {
                      color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                    }
                  }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                  {t('products.supplier')}
                </InputLabel>
                <Select
                  value={filterSupplier}
                  onChange={e => setFilterSupplier(e.target.value)}
                  sx={{
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode
                      ? '1px solid rgba(255,255,255,0.1)'
                      : '1px solid rgba(0,0,0,0.1)',
                    '&:hover': {
                      backgroundColor: darkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.9)',
                      border: darkMode
                        ? '1px solid rgba(255,255,255,0.2)'
                        : '1px solid rgba(0,0,0,0.2)'
                    },
                    '& .MuiSelect-select': {
                      color: darkMode ? '#ffffff' : '#000000'
                    },
                    '& .MuiSvgIcon-root': {
                      color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                    }
                  }}
                >
                  <MenuItem value="">All Suppliers</MenuItem>
                  {suppliers.map(supplier => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography
                variant="body2"
                sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
              >
                {filteredProducts.length} of {products.length} products
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card
        sx={{
          mb: 3,
          background: darkMode
            ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
            : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          backdropFilter: 'blur(10px)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography
              variant="h6"
              fontWeight="600"
              sx={{ color: darkMode ? '#ffffff' : '#000000' }}
            >
              Products Inventory
            </Typography>
            <Tooltip title="View and manage your product inventory. Use the + and - buttons to quickly adjust stock levels. Click the edit icon to modify product details, or the message icon to contact suppliers.">
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
              background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ background: 'linear-gradient(45deg, #1976d2, #42a5f5)' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    {t('products.productName')}
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Code</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    {t('products.category')}
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    {t('products.stock')}
                    <Tooltip title="Produtos ordenados por prioridade de estoque: 🔴 Zerados → 🟡 Baixos → 🟢 Normais">
                      <HelpCircle size={14} style={{ marginLeft: 8, opacity: 0.8, cursor: 'help' }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    {t('products.price')}
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    {t('products.supplier')}
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    {t('products.actions')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedProducts.map(product => (
                  <TableRow
                    key={product.id}
                    sx={{
                      backgroundColor: darkMode
                        ? 'rgba(255,255,255,0.02)'
                        : 'rgba(255,255,255,0.5)',
                      '&:hover': {
                        background: darkMode
                          ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.05) 100%)'
                          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                      }
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar
                          sx={{
                            mr: 2,
                            bgcolor: product.em_estoque_baixo ? 'warning.main' : 'success.main'
                          }}
                        >
                          <Package size={20} />
                        </Avatar>
                        <Box>
                          <Typography
                            variant="subtitle1"
                            fontWeight="600"
                            sx={{ color: darkMode ? '#ffffff' : '#000000' }}
                          >
                            {product.nome}
                          </Typography>
                          {product.descricao && (
                            <Typography
                              variant="body2"
                              sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                              noWrap
                            >
                              {product.descricao}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={product.codigo} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>
                      {product.categoria}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => handleQuickStockAdjust(product.id, -1)}
                            disabled={adjustingStock.has(product.id)}
                            sx={{
                              color: 'error.main',
                              p: 0.5,
                              minWidth: 'auto',
                              width: 24,
                              height: 24
                            }}
                          >
                            {adjustingStock.has(product.id) ? (
                              <CircularProgress size={12} color="error" />
                            ) : (
                              <MinusCircle size={14} />
                            )}
                          </IconButton>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              minWidth: 30,
                              textAlign: 'center',
                              color: darkMode ? '#ffffff' : '#000000'
                            }}
                          >
                            {product.quantidade}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleQuickStockAdjust(product.id, 1)}
                            disabled={adjustingStock.has(product.id)}
                            sx={{
                              color: 'success.main',
                              p: 0.5,
                              minWidth: 'auto',
                              width: 24,
                              height: 24
                            }}
                          >
                            {adjustingStock.has(product.id) ? (
                              <CircularProgress size={12} color="success" />
                            ) : (
                              <PlusCircle size={14} />
                            )}
                          </IconButton>
                          {product.quantidade <= product.estoque_minimo && (
                            <AlertTriangle
                              size={16}
                              color={
                                product.quantidade === 0
                                  ? "#ef4444"  // Vermelho para estoque zerado
                                  : "#f59e0b"  // Amarelo para estoque baixo
                              }
                            />
                          )}
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((product.quantidade / product.estoque_minimo) * 100, 100)}
                          sx={{
                            mt: 0.5,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor:
                                product.quantidade === 0
                                  ? '#ef4444'  // Vermelho para estoque zerado
                                  : product.quantidade <= product.estoque_minimo
                                    ? '#f59e0b'  // Amarelo para estoque baixo
                                    : '#10b981', // Verde para estoque bom
                              borderRadius: 2
                            }
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                        >
                          Min: {product.estoque_minimo}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="600" color="success.main">
                          ${product.preco.toFixed(2)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                        >
                          Total: ${(product.preco * product.quantidade).toFixed(2)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>
                      {getSupplierName(product.fornecedor_id)}
                    </TableCell>
                    <TableCell>
                      {product.quantidade === 0 ? (
                        <Chip
                          label={t('products.outOfStock')}
                          color="error"
                          size="small"
                          icon={<AlertTriangle size={14} />}
                        />
                      ) : product.em_estoque_baixo ? (
                        <Chip
                          label={t('products.lowStock')}
                          color="warning"
                          size="small"
                          icon={<AlertTriangle size={14} />}
                        />
                      ) : (
                        <Chip
                          label="In Stock"
                          color="success"
                          size="small"
                          icon={<TrendingUp size={14} />}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Edit Product">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(product)}
                            sx={{ color: 'primary.main' }}
                          >
                            <Edit size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ML Analysis">
                          <IconButton
                            size="small"
                            onClick={() => handleMLAnalysis(product)}
                            sx={{ color: 'info.main' }}
                          >
                            <Brain size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Contact Supplier">
                          <IconButton
                            size="small"
                            onClick={() => handleContactSupplier(product)}
                            sx={{ color: 'success.main' }}
                          >
                            <MessageCircle size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Product">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(product.id)}
                            sx={{ color: 'error.main' }}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ background: 'linear-gradient(45deg, #1976d2, #42a5f5)', color: 'white' }}
        >
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Code"
                value={formData.codigo}
                onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                disabled={!!editingProduct}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Name"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Category"
                value={formData.categoria}
                onChange={e => setFormData({ ...formData, categoria: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Supplier</InputLabel>
                <Select
                  value={formData.fornecedor_id}
                  onChange={e => setFormData({ ...formData, fornecedor_id: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {suppliers.map(supplier => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Price"
                value={formData.preco}
                onChange={e => setFormData({ ...formData, preco: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Stock"
                value={formData.estoque_minimo}
                onChange={e =>
                  setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) || 0 })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Lead Time (days)"
                value={formData.lead_time_days}
                onChange={e =>
                  setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })
                }
                helperText="Days for supplier to deliver"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Safety Stock"
                value={formData.safety_stock}
                onChange={e =>
                  setFormData({ ...formData, safety_stock: parseInt(e.target.value) || 0 })
                }
                helperText="Buffer stock quantity"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              '&:hover': { background: 'linear-gradient(45deg, #1565c0, #1976d2)' }
            }}
          >
            {editingProduct ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

