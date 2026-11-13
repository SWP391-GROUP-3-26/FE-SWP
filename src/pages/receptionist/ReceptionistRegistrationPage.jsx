import { useParams } from 'react-router-dom'
import MemberClasses from '../member/MemberClasses'
import MemberPackages from '../member/MemberPackages'
import MemberPaymentResult from '../member/MemberPaymentResult'

const pages = { classes: MemberClasses, packages: MemberPackages, 'payment-result': MemberPaymentResult }

export default function ReceptionistRegistrationPage({ type }) {
  const { id } = useParams()
  const Page = pages[type]
  return <Page key={id} receptionist memberId={id} />
}
