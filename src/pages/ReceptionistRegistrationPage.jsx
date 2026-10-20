import { useParams } from 'react-router-dom'
import MemberClasses from './MemberClasses'
import MemberPackages from './MemberPackages'
import MemberPaymentResult from './MemberPaymentResult'

const pages = { classes: MemberClasses, packages: MemberPackages, 'payment-result': MemberPaymentResult }

export default function ReceptionistRegistrationPage({ type }) {
  const { id } = useParams()
  const Page = pages[type]
  return <Page key={id} receptionist memberId={id} />
}
