import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import React, { useCallback, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Fonts } from '../../../utils/GlobalText';
import { 
  ChevronLeft, 
  Plus, 
  Car, 
  Train, 
  Plane, 
  Upload, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Hotel, 
  UtensilsCrossed,
  Navigation,
  User,
  Info,
  CreditCard,
  Wallet,
  ShoppingBag,
  Trash2,
  Receipt,
  AlertCircle
} from 'lucide-react-native';

const Reimbursement = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('new'); // new, pending, approved
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [expenseType, setExpenseType] = useState('car');
  const [amount, setAmount] = useState('');
  const [hotelCost, setHotelCost] = useState('');
  const [foodCost, setFoodCost] = useState('');
  const [date, setDate] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [travelPaymentMethod, setTravelPaymentMethod] = useState('self-paid');
  const [hotelPaymentMethod, setHotelPaymentMethod] = useState('self-paid');
  const [foodPaymentMethod, setFoodPaymentMethod] = useState('self-paid');
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [kilometers, setKilometers] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dummy data for reimbursement requests
  const [reimbursements, setReimbursements] = useState([
    {
      id: 1,
      type: 'flight',
      title: 'Flight Ticket - Client Meeting',
      amount: 1420,
      date: '2026-03-15',
      fromLocation: 'New York',
      toLocation: 'San Francisco',
      purpose: 'Client Meeting for project discussion',
      status: 'approved',
      submittedDate: '2026-03-16',
      approvedBy: 'Lisa Brown',
      approvedDate: '2026-03-17',
      paymentMethod: 'company-paid',
      travelCost: 1420,
      hotelCost: 0,
      foodCost: 0,
    },
    {
      id: 2,
      type: 'car',
      title: 'Car Travel - Business Visit',
      amount: 180,
      date: '2026-03-18',
      fromLocation: 'Office',
      toLocation: 'Client Site',
      purpose: 'Business visit to client location',
      status: 'pending',
      submittedDate: '2026-03-18',
      paymentMethod: 'self-paid',
      travelCost: 120,
      hotelCost: 0,
      foodCost: 60,
      kilometers: 12,
    },
    {
      id: 3,
      type: 'train',
      title: 'Train Travel - Conference',
      amount: 315,
      date: '2026-03-10',
      fromLocation: 'Boston',
      toLocation: 'Providence',
      purpose: 'Conference Attendance',
      status: 'approved',
      submittedDate: '2026-03-11',
      approvedBy: 'Lisa Brown',
      approvedDate: '2026-03-12',
      paymentMethod: 'company-paid',
      travelCost: 65,
      hotelCost: 200,
      foodCost: 50,
    },
    {
      id: 4,
      type: 'other',
      title: 'Conference Registration & Accommodation',
      amount: 580,
      date: '2026-03-12',
      fromLocation: 'Home Office',
      toLocation: 'Tech Summit, Austin',
      purpose: 'Attended 3-day technology conference with networking dinner',
      status: 'approved',
      submittedDate: '2026-03-14',
      approvedBy: 'Lisa Brown',
      approvedDate: '2026-03-15',
      paymentMethod: 'company-paid',
      travelCost: 250,
      hotelCost: 250,
      foodCost: 80,
      otherExpenses: [
        { id: '1', description: 'Conference Registration', amount: 100, paymentMethod: 'company-paid' },
        { id: '2', description: 'Networking Dinner', amount: 50, paymentMethod: 'self-paid' },
      ],
    },
    {
      id: 5,
      type: 'flight',
      title: 'Flight - Business Trip',
      amount: 850,
      date: '2026-03-20',
      fromLocation: 'Chicago',
      toLocation: 'Los Angeles',
      purpose: 'Client presentation',
      status: 'pending',
      submittedDate: '2026-03-20',
      paymentMethod: 'self-paid',
      travelCost: 850,
      hotelCost: 0,
      foodCost: 0,
    },
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getExpenseIcon = (type) => {
    switch (type) {
      case 'car':
        return <Car size={wp('4%')} color="#FF6B35" />;
      case 'train':
        return <Train size={wp('4%')} color="#4A90E2" />;
      case 'flight':
        return <Plane size={wp('4%')} color="#9B59B6" />;
      default:
        return <FileText size={wp('4%')} color="#1ABC9C" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return { bg: '#2ECC71', color: '#fff' };
      case 'pending':
        return { bg: '#F39C12', color: '#fff' };
      case 'rejected':
        return { bg: '#E74C3C', color: '#fff' };
      default:
        return { bg: '#95A5A6', color: '#fff' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={wp('3%')} color="#fff" />;
      case 'pending':
        return <Clock size={wp('3%')} color="#fff" />;
      case 'rejected':
        return <XCircle size={wp('3%')} color="#fff" />;
      default:
        return null;
    }
  };

  const addOtherExpense = () => {
    setOtherExpenses([
      ...otherExpenses,
      { id: Date.now().toString(), description: '', amount: '', paymentMethod: 'self-paid' }
    ]);
  };

  const removeOtherExpense = (id) => {
    setOtherExpenses(otherExpenses.filter(item => item.id !== id));
  };

  const updateOtherExpense = (id, field, value) => {
    setOtherExpenses(otherExpenses.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotalAmount = () => {
    const travel = parseFloat(amount) || 0;
    const hotel = parseFloat(hotelCost) || 0;
    const food = parseFloat(foodCost) || 0;
    const otherTotal = otherExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    return travel + hotel + food + otherTotal;
  };

  const handleSubmitExpense = () => {
    if (!amount || !date || !fromLocation || !toLocation || !purpose) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const newRequest = {
        id: reimbursements.length + 1,
        type: expenseType,
        title: `${expenseType === 'car' ? 'Car Travel' : expenseType === 'train' ? 'Train Travel' : expenseType === 'flight' ? 'Flight Travel' : 'Other Expense'} - ${purpose.substring(0, 30)}`,
        amount: calculateTotalAmount(),
        date: date,
        fromLocation: fromLocation,
        toLocation: toLocation,
        purpose: purpose,
        status: 'pending',
        submittedDate: new Date().toISOString().split('T')[0],
        paymentMethod: travelPaymentMethod,
        travelCost: parseFloat(amount) || 0,
        hotelCost: parseFloat(hotelCost) || 0,
        foodCost: parseFloat(foodCost) || 0,
        otherExpenses: otherExpenses.length > 0 ? otherExpenses : undefined,
        kilometers: kilometers ? parseFloat(kilometers) : undefined,
      };
      
      setReimbursements([newRequest, ...reimbursements]);
      setSubmitting(false);
      setShowCreateForm(false);
      
      // Reset form
      setExpenseType('car');
      setAmount('');
      setHotelCost('');
      setFoodCost('');
      setDate('');
      setFromLocation('');
      setToLocation('');
      setPurpose('');
      setSelectedFile('');
      setTravelPaymentMethod('self-paid');
      setHotelPaymentMethod('self-paid');
      setFoodPaymentMethod('self-paid');
      setOtherExpenses([]);
      setKilometers('');
      
      Alert.alert('Success', 'Expense submitted successfully!');
    }, 1000);
  };

  const getFilteredRequests = () => {
    if (activeFilter === 'new') {
      return reimbursements.filter(r => r.status === 'pending');
    } else if (activeFilter === 'approved') {
      return reimbursements.filter(r => r.status === 'approved');
    }
    return reimbursements;
  };

  const getFilterCounts = () => {
    return {
      new: reimbursements.filter(r => r.status === 'pending').length,
      approved: reimbursements.filter(r => r.status === 'approved').length,
    };
  };

  const counts = getFilterCounts();

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />
      
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: C.background,
            borderBottomColor: C.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            {
              backgroundColor: C.surface,
              borderColor: C.border,
            },
          ]}
        >
          <ChevronLeft size={wp('5%')} color={C.textPrimary} />
        </TouchableOpacity>

        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>
            {t.reimbursement?.title || 'Reimbursement'}
          </Text>
          <Text style={[styles.pageSubtitle, { color: C.textSecondary }]}>
            {reimbursements.length} Total Requests
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.primary }]}
          onPress={() => setShowCreateForm(true)}
        >
          <Plus size={wp('5%')} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'new' && styles.activeFilterTab, activeFilter === 'new' && { borderBottomColor: C.primary }]}
          onPress={() => setActiveFilter('new')}
        >
          <Clock size={wp('4%')} color={activeFilter === 'new' ? C.primary : C.textSecondary} />
          <Text style={[styles.filterText, { color: activeFilter === 'new' ? C.primary : C.textSecondary }]}>
            Pending Requests ({counts.new})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'approved' && styles.activeFilterTab, activeFilter === 'approved' && { borderBottomColor: C.primary }]}
          onPress={() => setActiveFilter('approved')}
        >
          <CheckCircle size={wp('4%')} color={activeFilter === 'approved' ? C.primary : C.textSecondary} />
          <Text style={[styles.filterText, { color: activeFilter === 'approved' ? C.primary : C.textSecondary }]}>
            Approved ({counts.approved})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
      >
        {getFilteredRequests().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Receipt size={wp('15%')} color={C.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>
              No {activeFilter === 'new' ? 'pending' : 'approved'} requests
            </Text>
            <Text style={[styles.emptySubText, { color: C.textTertiary }]}>
              {activeFilter === 'new' ? 'Tap + button to create a new request' : 'Approved requests will appear here'}
            </Text>
          </View>
        ) : (
          getFilteredRequests().map((item) => (
            <View
              key={item.id}
              style={[styles.requestCard, { backgroundColor: C.surface, borderColor: C.border }]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.typeIcon}>
                  {getExpenseIcon(item.type)}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.requestTitle, { color: C.textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.requestDate, { color: C.textSecondary }]}>
                    {formatDate(item.date)} • {item.fromLocation} → {item.toLocation}
                  </Text>
                </View>
                <Text style={[styles.amount, { color: C.primary }]}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: C.border }]} />

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: C.textSecondary }]}>Purpose:</Text>
                  <Text style={[styles.detailValue, { color: C.textPrimary }]} numberOfLines={2}>
                    {item.purpose}
                  </Text>
                </View>
                
                <View style={styles.paymentMethodRow}>
                  <View style={styles.paymentBadge}>
                    {item.paymentMethod === 'self-paid' ? (
                      <Wallet size={wp('3%')} color="#3498DB" />
                    ) : (
                      <CreditCard size={wp('3%')} color="#9B59B6" />
                    )}
                    <Text style={[styles.paymentText, { color: C.textSecondary }]}>
                      {item.paymentMethod === 'self-paid' ? 'Self-Paid' : 'Company-Paid'}
                    </Text>
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status).bg }]}>
                    {getStatusIcon(item.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(item.status).color }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {item.status === 'approved' && item.approvedBy && (
                  <Text style={[styles.approvedText, { color: C.textTertiary }]}>
                    Approved by {item.approvedBy} on {formatDate(item.approvedDate)}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Expense Modal */}
      <Modal
        visible={showCreateForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>New Reimbursement Request</Text>
              <TouchableOpacity onPress={() => setShowCreateForm(false)}>
                <XCircle size={wp('6%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Travel Type Selection */}
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Travel Type *</Text>
              <View style={styles.typeGrid}>
                {['car', 'train', 'flight', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      { borderColor: C.border },
                      expenseType === type && { borderColor: C.primary, backgroundColor: C.primary + '10' }
                    ]}
                    onPress={() => setExpenseType(type)}
                  >
                    {type === 'car' && <Car size={wp('5%')} color={expenseType === type ? C.primary : C.textSecondary} />}
                    {type === 'train' && <Train size={wp('5%')} color={expenseType === type ? C.primary : C.textSecondary} />}
                    {type === 'flight' && <Plane size={wp('5%')} color={expenseType === type ? C.primary : C.textSecondary} />}
                    {type === 'other' && <FileText size={wp('5%')} color={expenseType === type ? C.primary : C.textSecondary} />}
                    <Text style={[styles.typeText, { color: expenseType === type ? C.primary : C.textSecondary }]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Car KM Tracking */}
              {expenseType === 'car' && (
                <View>
                  <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Distance (KM) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
                    placeholder="Enter kilometers"
                    placeholderTextColor={C.textTertiary}
                    keyboardType="numeric"
                    value={kilometers}
                    onChangeText={setKilometers}
                  />
                </View>
              )}

              {/* Amount Field */}
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Travel Amount *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
                placeholder="Enter amount"
                placeholderTextColor={C.textTertiary}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              {/* Payment Method */}
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Payment Method *</Text>
              <View style={styles.paymentMethodGrid}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodOption,
                    { borderColor: C.border },
                    travelPaymentMethod === 'self-paid' && { borderColor: C.primary, backgroundColor: C.primary + '10' }
                  ]}
                  onPress={() => setTravelPaymentMethod('self-paid')}
                >
                  <Wallet size={wp('4%')} color={travelPaymentMethod === 'self-paid' ? C.primary : C.textSecondary} />
                  <Text style={[styles.paymentMethodText, { color: travelPaymentMethod === 'self-paid' ? C.primary : C.textSecondary }]}>
                    Self-Paid
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodOption,
                    { borderColor: C.border },
                    travelPaymentMethod === 'company-paid' && { borderColor: C.primary, backgroundColor: C.primary + '10' }
                  ]}
                  onPress={() => setTravelPaymentMethod('company-paid')}
                >
                  <CreditCard size={wp('4%')} color={travelPaymentMethod === 'company-paid' ? C.primary : C.textSecondary} />
                  <Text style={[styles.paymentMethodText, { color: travelPaymentMethod === 'company-paid' ? C.primary : C.textSecondary }]}>
                    Company-Paid
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Hotel & Food Expenses */}
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Additional Expenses (Optional)</Text>
              
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Hotel Cost</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
                placeholder="Enter hotel cost"
                placeholderTextColor={C.textTertiary}
                keyboardType="numeric"
                value={hotelCost}
                onChangeText={setHotelCost}
              />

              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Food Cost</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
                placeholder="Enter food cost"
                placeholderTextColor={C.textTertiary}
                keyboardType="numeric"
                value={foodCost}
                onChangeText={setFoodCost}
              />

              {/* Other Expenses */}
              <View style={styles.otherExpensesHeader}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Other Expenses</Text>
                <TouchableOpacity onPress={addOtherExpense} style={[styles.addExpenseBtn, { borderColor: C.primary }]}>
                  <Plus size={wp('3%')} color={C.primary} />
                  <Text style={[styles.addExpenseText, { color: C.primary }]}>Add</Text>
                </TouchableOpacity>
              </View>

              {otherExpenses.map((expense) => (
                <View key={expense.id} style={styles.otherExpenseItem}>
                  <TextInput
                    style={[styles.otherExpenseInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary, flex: 2 }]}
                    placeholder="Description"
                    placeholderTextColor={C.textTertiary}
                    value={expense.description}
                    onChangeText={(text) => updateOtherExpense(expense.id, 'description', text)}
                  />
                  <TextInput
                    style={[styles.otherExpenseInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary, flex: 1 }]}
                    placeholder="Amount"
                    placeholderTextColor={C.textTertiary}
                    keyboardType="numeric"
                    value={expense.amount}
                    onChangeText={(text) => updateOtherExpense(expense.id, 'amount', text)}
                  />
                  <TouchableOpacity onPress={() => removeOtherExpense(expense.id)}>
                    <Trash2 size={wp('5%')} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Date */}
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Date *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textTertiary}
                value={date}
                onChangeText={setDate}
              />

              {/* Locations */}
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>From Location *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
                placeholder="Starting point"
                placeholderTextColor={C.textTertiary}
                value={fromLocation}
                onChangeText={setFromLocation}
              />

              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>To Location *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
                placeholder="Destination"
                placeholderTextColor={C.textTertiary}
                value={toLocation}
                onChangeText={setToLocation}
              />

              {/* Purpose */}
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Business Purpose *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
                placeholder="Describe the purpose..."
                placeholderTextColor={C.textTertiary}
                multiline
                numberOfLines={3}
                value={purpose}
                onChangeText={setPurpose}
              />

              {/* Total Amount */}
              <View style={[styles.totalContainer, { borderTopColor: C.border }]}>
                <Text style={[styles.totalLabel, { color: C.textPrimary }]}>Total Amount:</Text>
                <Text style={[styles.totalAmount, { color: C.primary }]}>{formatCurrency(calculateTotalAmount())}</Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: C.primary }]}
                onPress={handleSubmitExpense}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingBottom: hp('3%'),
    paddingHorizontal: wp('4%'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('5%'),
    paddingBottom: hp('2%'),
    borderBottomWidth: 1,
  },
  backBtn: {
    width: wp('9%'),
    height: wp('9%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    flex: 1,
    paddingLeft: wp('3%'),
  },
  pageTitle: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  addBtn: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp('4%'),
    borderBottomWidth: 1,
    width:'100%',
    alignItems:'center',
    justifyContent:'center'
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('1.5%'),
    marginRight: wp('6%'),
    gap: wp('2%'),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomWidth: 2,
  },
  filterText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  requestCard: {
    borderRadius: wp('3%'),
    borderWidth: 1,
    padding: wp('4%'),
    marginTop: hp('1.5%'),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('2%'),
    backgroundColor: '#FF6B3510',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('3%'),
  },
  cardInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: wp('3.8%'),
    fontFamily: Fonts.bold,
  },
  requestDate: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  amount: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
  },
  divider: {
    height: 1,
    marginVertical: hp('1.5%'),
  },
  cardDetails: {
    gap: hp('1%'),
  },
  detailRow: {
    flexDirection: 'row',
    gap: wp('2%'),
  },
  detailLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    width: wp('15%'),
  },
  detailValue: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    flex: 1,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1%'),
  },
  paymentText: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.5%'),
    borderRadius: wp('3%'),
    gap: wp('1%'),
  },
  statusText: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.medium,
  },
  approvedText: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp('20%'),
  },
  emptyText: {
    marginTop: hp('2%'),
    fontSize: wp('4%'),
    fontFamily: Fonts.medium,
  },
  emptySubText: {
    marginTop: hp('1%'),
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: hp('90%'),
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
    padding: wp('5%'),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  modalTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
  },
  inputLabel: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
    marginTop: hp('1.5%'),
    marginBottom: hp('0.5%'),
  },
  input: {
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    minHeight: hp('10%'),
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: wp('2%'),
    marginBottom: hp('1%'),
  },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    alignItems: 'center',
    gap: hp('0.5%'),
  },
  typeText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    gap: wp('2%'),
    marginBottom: hp('1%'),
  },
  paymentMethodOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp('2%'),
  },
  paymentMethodText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  sectionTitle: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
    marginTop: hp('2%'),
    marginBottom: hp('1%'),
  },
  otherExpensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp('1%'),
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: wp('2%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.8%'),
    gap: wp('1%'),
  },
  addExpenseText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  otherExpenseItem: {
    flexDirection: 'row',
    gap: wp('2%'),
    marginBottom: hp('1%'),
    alignItems: 'center',
  },
  otherExpenseInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('2%'),
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp('2%'),
    marginTop: hp('2%'),
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
  },
  totalAmount: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
  },
  submitBtn: {
    paddingVertical: hp('1.8%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    marginTop: hp('2%'),
    marginBottom: hp('2%'),
  },
  submitBtnText: {
    color: '#fff',
    fontSize: wp('3.8%'),
    fontFamily: Fonts.bold,
  },
});

export default Reimbursement;