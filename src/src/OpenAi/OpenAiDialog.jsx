import { I18n } from '@iobroker/adapter-react-v5';
import { AutoFixNormal } from '@mui/icons-material';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField,
} from '@mui/material';
import { useState } from 'react';
import { Configuration, OpenAIApi } from 'openai';
import { detectDevice, systemPrompt } from './OpenAiPrompt';

const OpenAiDialog = props => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [open, setOpen] = useState(false);
    return <>
        <IconButton
            key="ai"
            aria-label="AI"
            title={I18n.t('AI')}
            className={props.classes.toolbarButtons}
            size="medium"
            onClick={() => setOpen(true)}
        >
            <AutoFixNormal />
        </IconButton>
        <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogTitle>{I18n.t('AI assistant')}</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>
                    <TextField
                        variant="standard"
                        multiline
                        fullWidth
                        label={I18n.t('Enter your question')}
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                    />
                </div>
                <div>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            const devices = await detectDevice(props.socket);
                            const config = await props.socket.getObject('system.adapter.javascript.0');
                            const docs = await systemPrompt();
                            const configuration = new Configuration({
                                apiKey: config.native.gptKey,
                            });
                            const openai = new OpenAIApi(configuration);

                            const chatCompletionPhase1 = await openai.createChatCompletion({
                                model: 'gpt-3.5-turbo-16k',
                                messages: [
                                    { role: 'system', content: `You are programmer. Here is a documentation:\n\n${docs}` },
                                    { role: 'system', content: `Here is list of devices:\n\n${JSON.stringify(devices, null, 2)}` },
                                    { role: 'user', content: `Write code that do:\n\n${question}\n\nReturn only code.` }],
                            });
                            console.log(chatCompletionPhase1.data.choices[0].message);
                            const chatCompletionPhase2 = await openai.createChatCompletion({
                                model: 'gpt-3.5-turbo-16k',
                                messages: [
                                    { role: 'user', content: `Remove \`\`\` from code: \n${chatCompletionPhase1.data.choices[0].message.content}` }],
                            });
                            console.log(chatCompletionPhase2.data.choices[0].message);
                            setAnswer(chatCompletionPhase2.data.choices[0].message.content);
                        }}
                    >
                        {I18n.t('Ask')}
                    </Button>
                </div>
                <div>
                    <TextField
                        variant="standard"
                        multiline
                        fullWidth
                        label={I18n.t('Answer')}
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                    />
                </div>
            </DialogContent>
            <DialogActions>
            </DialogActions>
        </Dialog>
    </>;
};

export default OpenAiDialog;
