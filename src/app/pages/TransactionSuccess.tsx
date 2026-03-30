import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router';
import { Check, Share2, Download, X } from 'lucide-react';

export default function TransactionSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { transaction, recipientName, recipientBank } = location.state || {};
  const amountValue = transaction?.amount ?? transaction?.total ?? location.state?.amount ?? 0;
  const feeValue = transaction?.fee ?? 0;
  const totalValue = transaction?.total ?? amountValue;

  if (!transaction) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#235697] to-[#114280] flex items-center justify-center z-50 p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="absolute top-6 right-6 text-white/80 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-28 h-28 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <Check size={56} className="text-white" strokeWidth={3} />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white mb-3"
          >
            Transfer successful!
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 mb-8"
          >
            You have successfully transferred{' '}
            <span className="font-bold">₦{Number(amountValue).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</span>
            {recipientBank && (
              <>
                <br />
                Bank Name: {recipientBank}
                <br />
                {recipientName}
              </>
            )}
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <button className="w-full bg-white text-[#235697] py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors">
              <Share2 size={20} />
              Share receipt
            </button>

            <button className="w-full bg-white/10 backdrop-blur-sm text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/20">
              <Download size={20} />
              Download receipt
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full text-white/80 py-4 font-medium hover:text-white transition-colors"
            >
              Back to Home
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-left"
          >
            <div className="text-xs text-white/70 mb-3">Transaction Breakdown</div>
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>Amount</span>
              <span>₦{Number(amountValue).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/80 mt-1">
              <span>Fee</span>
              <span>₦{Number(feeValue).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white mt-2 font-semibold">
              <span>Total</span>
              <span>₦{Number(totalValue).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
            <div className="border-t border-white/20 my-3" />
            <p className="text-white/60 text-xs mb-2">Transaction Reference</p>
            <p className="text-white text-sm font-mono">{transaction.reference || transaction?.reference}</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
