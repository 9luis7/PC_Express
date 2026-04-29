import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Help as HelpIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import { TableSkeleton } from './common/Skeletons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { suppliersAPI } from '../services/api';
import { ScrollReveal } from './common';

import { useDarkMode } from '../contexts/ThemeContext';

export default function Suppliers() {
  const { darkMode } = useDarkMode();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cnpj: '',
    observacoes: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async() => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(response.data);
      setLoading(false);
    } catch {
      setError('Failed to load suppliers');
      setLoading(false);
    }
  };

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        nome: supplier.nome,
        email: supplier.email || '',
        telefone: supplier.telefone || '',
        cnpj: supplier.cnpj || '',
        observacoes: supplier.observacoes || ''
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        cnpj: '',
        observacoes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async() => {
    try {
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier.id, formData);
      } else {
        await suppliersAPI.create(formData);
      }
      setOpenDialog(false);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save supplier');
    }
  };

  const handleDelete = async supplierId => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await suppliersAPI.delete(supplierId);
        fetchSuppliers();
      } catch {
        setError('Failed to delete supplier');
      }
    }
  };

  if (loading) {
    return <TableSkeleton rows={6} />;
  }

  return (
    <Box>
      <ScrollReveal direction="down" duration={0.5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4" sx={{ color: darkMode ? '#ffffff' : '#000000' }}>
              {t('suppliers.title')}
            </Typography>
            <IconButton
              size="small"
              title="Manage your supplier contacts. Add new suppliers, edit existing ones, and track their information for purchase order management."
              sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
            >
              <HelpIcon />
            </IconButton>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            {t('suppliers.addSupplier')}
          </Button>
        </Box>
      </ScrollReveal>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <ScrollReveal direction="up" delay={0.2}>
        <TableContainer component={Paper}>
          <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('suppliers.supplierName')}</TableCell>
              <TableCell>{t('suppliers.email')}</TableCell>
              <TableCell>{t('suppliers.phone')}</TableCell>
              <TableCell>CNPJ</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>{t('suppliers.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map(supplier => (
              <TableRow key={supplier.id}>
                <TableCell>{supplier.nome}</TableCell>
                <TableCell>{supplier.email || '-'}</TableCell>
                <TableCell>{supplier.telefone || '-'}</TableCell>
                <TableCell>{supplier.cnpj || '-'}</TableCell>
                <TableCell>
                  {supplier.observacoes ? (
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {supplier.observacoes}
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{new Date(supplier.criado_em).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpenDialog(supplier)} title="Edit">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(supplier.id)} title="Delete">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </TableContainer>
      </ScrollReveal>

      {/* Supplier Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSupplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={t('suppliers.supplierName')}
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={t('suppliers.email')}
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={t('suppliers.phone')}
                value={formData.telefone}
                onChange={e => setFormData({ ...formData, telefone: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="CNPJ"
                value={formData.cnpj}
                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.observacoes}
                onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSupplier ? t('common.save') : t('common.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

