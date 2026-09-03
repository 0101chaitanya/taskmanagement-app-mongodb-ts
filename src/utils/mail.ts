import {createTransport,} from "nodemailer";
import {MailtrapTransport} from "mailtrap";
import Mailgen from "mailgen";


const sender = {
    address: "hello@example.com",
    name: "Mailtrap Test",
};
const recipients = [
    "0101chaitanya@gmail.com",
];

export interface SendMailOptions {
    email: string;
    subject: string;
    mailgenContent: Mailgen.Content;
}

const sendEmail = async (options: SendMailOptions) => {
    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: "Task Manager",
            link: "https://taskmanangerchaitu.com",
        }
    })
    const emailTextual: string = mailGenerator.generatePlaintext(options.mailgenContent)
    const emailHTML: string = mailGenerator.generate(options.mailgenContent)
    const transporter = createTransport(
        MailtrapTransport({
            token: process.env.MAIL_TRANSPORT_API_TOKEN!,
            sandbox: true,
            testInboxId: 4888371,
        }));

    try {
        await transporter.sendMail({
            from: sender,
            to: recipients,
            subject: options.subject,
            text: emailTextual,
            html: emailHTML,
            category: "Integration Test",
        })
    } catch (error: unknown) {
        console.error(
            "Email service failed silently. Make sure that you have provided" +
            " your MAILTRAP credentials in the .env file"
        );
        console.error("Error: ", error);
    }
}
const getMailgenContentForEmailVerification = (
    username: string,
    verificationUrl: string
): Mailgen.Content => {
    return {
        body: {
            name: username,
            intro: "Welcome to our App! We're excited to have you on board.",
            action: {
                instructions: "To verify your email please click on the" +
                    " following button",
                button: {
                    color: "#22BC66",
                    text: "Verify your email",
                    link: verificationUrl,
                },
            },
            outro: "Need help, or have questions? Just reply to this email," +
                " we'd love to help.",
        },
    };
};

const getMailgenContentForForgotPassword = (
    username: string,
    passwordResetUrl: string
): Mailgen.Content => {
    return {
        body: {
            name: username,
            intro: "We got a request to reset the password of your account",
            action: {
                instructions: "To reset your password click on the following" +
                    " button or link",
                button: {
                    color: "#22BC66",
                    text: "Reset password",
                    link: passwordResetUrl,
                },
            },
            outro: "Need help, or have questions? Just reply to this email," +
                " we'd love to help.",
        },
    };
};


export {
    getMailgenContentForForgotPassword,
    getMailgenContentForEmailVerification,
    sendEmail,
};