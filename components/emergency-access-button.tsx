import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { requestEmergencyAccess } from '@/lib/emergency-access'

interface EmergencyAccessButtonProps {
  doctorAddress: string;
  doctorName: string;
  patientAddress: string;
  patientName: string;
  onAccessGranted?: () => void;
}

export function EmergencyAccessButton({
  doctorAddress,
  doctorName,
  patientAddress,
  patientName,
  onAccessGranted
}: EmergencyAccessButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleRequestEmergencyAccess = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for emergency access');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('[v0] Requesting emergency access...');
      const result = requestEmergencyAccess(
        doctorAddress,
        doctorName,
        patientAddress,
        patientName,
        reason
      );

      if (result.success) {
        console.log('[v0] Emergency access granted');
        setSuccess(result.message);
        setReason('');
        
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(null);
          onAccessGranted?.();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('[v0] Emergency access error:', err);
      setError('Failed to request emergency access');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        title="Emergency break-glass access (1 hour)"
      >
        <AlertTriangle className="w-4 h-4" />
        Emergency Access
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border-red-200 bg-red-50">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency Break-Glass Access
            </DialogTitle>
            <DialogDescription className="text-red-600">
              Request immediate access to {patientName}'s critical records for emergency situations only.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive" className="border-red-300 bg-red-100">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                This action creates a time-limited 1-hour access window and will be logged for audit purposes.
              </span>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Patient: {patientName}</label>
              <div className="bg-white p-2 rounded border border-red-200 text-sm text-gray-600">
                {patientAddress}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium text-red-700">
                Emergency Reason *
              </label>
              <Textarea
                id="reason"
                placeholder="Describe the emergency situation and why immediate access is needed (e.g., 'Patient in critical condition requiring immediate medical intervention')..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-24 border-red-200 focus:border-red-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                Access duration: 1 hour from grant time
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-100 border-red-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-100 border-green-300">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">{success}</span>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRequestEmergencyAccess}
              disabled={isLoading || !reason.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Grant Emergency Access
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
