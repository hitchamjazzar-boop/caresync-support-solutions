import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "https://esm.sh/@react-email/components@0.0.22";
import * as React from "https://esm.sh/react@18.3.1";

interface WelcomeEmailProps {
  fullName: string;
  email: string;
  password: string;
  position?: string;
  department?: string;
  appUrl: string;
}

export const WelcomeEmail = ({
  fullName,
  email,
  password,
  position,
  department,
  appUrl,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Care Sync Support Solutions - Your Login Credentials</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Care Sync Support Solutions!</Heading>
        
        <Text style={text}>
          Hello {fullName},
        </Text>
        
        <Text style={text}>
          We're excited to have you join our team{position ? ` as ${position}` : ''}
          {department ? ` in the ${department} department` : ''}.
        </Text>

        <Section style={credentialsBox}>
          <Heading style={h2}>Your Login Credentials</Heading>
          <Text style={credentialText}>
            <strong>Email:</strong> {email}
          </Text>
          <Text style={credentialText}>
            <strong>Temporary Password:</strong> {password}
          </Text>
        </Section>

        <Text style={text}>
          Please log in to the employee portal using the credentials above:
        </Text>

        <Link
          href={`${appUrl}/auth`}
          target="_blank"
          style={button}
        >
          Access Employee Portal
        </Link>

        <Text style={warningText}>
          <strong>Important:</strong> For security reasons, please change your password after your first login.
        </Text>

        <Text style={text}>
          If you have any questions or need assistance, please don't hesitate to reach out to your manager or the HR team.
        </Text>

        <Text style={footer}>
          Best regards,<br />
          Care Sync Support Solutions Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 15px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
};

const credentialsBox = {
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  margin: '24px 48px',
  padding: '24px',
  border: '1px solid #e0e0e0',
};

const credentialText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '8px 0',
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: 'fit-content',
  padding: '12px 24px',
  margin: '24px 48px',
};

const warningText = {
  color: '#d9534f',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 48px',
  marginTop: '24px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 48px',
  marginTop: '32px',
};
