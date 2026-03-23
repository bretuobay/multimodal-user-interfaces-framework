import { Chat } from '../components/chat';

export const metadata = {
  title: 'MUIX Chat Demo',
  description: 'LLM streaming chat powered by @muix/agent + @muix/react',
};

export default function Home() {
  return <Chat />;
}
