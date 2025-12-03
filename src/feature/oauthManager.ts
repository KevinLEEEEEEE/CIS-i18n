import { emit } from '@create-figma-plugin/utilities';
import { googleOauthClientID, googleOauthClientSecret } from '../../config';
import { GoogleAccessTokenSuccessHandler, ShowToastHandler, StorageKey, ToastType } from '../types';
import { formRequestBody, getClientStorageValue, setLocalStorage } from '../utils/utility';

const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
const tokenEndpoint = 'https://oauth2.googleapis.com/token';

export async function setAccessToken(oauthCode: string) {
    if (oauthCode) {
        if (!googleOauthClientID || !googleOauthClientSecret) {
            emit<ShowToastHandler>('SHOW_TOAST', ToastType.Negative, 'Google OAuth not configured');
            return;
        }
        const requestBody = formRequestBody({
            code: oauthCode,
            client_id: googleOauthClientID,
            client_secret: googleOauthClientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        // 交换授权码获取访问令牌
        const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: requestBody,
        }).then(res => res.json());

        if (tokenResponse.access_token) {
            const expiresIn = tokenResponse.expires_in;
            const expireDate = new Date();
            expireDate.setSeconds(expireDate.getSeconds() + expiresIn);

            setLocalStorage(StorageKey.GoogleAccessToken, tokenResponse.access_token);
            setLocalStorage(StorageKey.GoogleAccessTokenExpireDate, expireDate.toISOString());
            setLocalStorage(StorageKey.GoogleRefreshToken, tokenResponse.refresh_token);

            emit<ShowToastHandler>('SHOW_TOAST', ToastType.Positive, 'Google Advanced Translation activated successfully');
            emit<GoogleAccessTokenSuccessHandler>('GOOGLE_ACCESS_TOKEN_SUCCESS');
        } else {
            console.error('[Oauth] Failed to obtain access token:', tokenResponse);
            emit<ShowToastHandler>('SHOW_TOAST', ToastType.Negative, 'Authorization code error. Contact developer for help.');
        }
    } else {
        console.error('[Oauth] Authorization code is empty');
    }
}

export async function checkAndrefreshAccessToken() {
    if (!googleOauthClientID || !googleOauthClientSecret) {
        return;
    }
    const expireDateStr = await getClientStorageValue(StorageKey.GoogleAccessTokenExpireDate);
    const secondsUntilExpiration = await accessTokenExpiredIn(expireDateStr);

    if (secondsUntilExpiration <= 0) {
        console.log('[Oauth] Access token expired, begin refreshing immediately.');
        const tokenResponse = await refreshAccessToken();
        if (tokenResponse) {
            await setRefreshTimer(tokenResponse.expires_in);
        }
    } else {
        console.log(`[Oauth] Access token is still valid. Token will be refreshed in ${secondsUntilExpiration} seconds.`);
        await setRefreshTimer(secondsUntilExpiration);
    }
}


async function setRefreshTimer(expiresInSeconds: number) {
    setTimeout(async () => {
        console.log('[Oauth] Refreshing access token before expiration.');
        const tokenResponse = await refreshAccessToken();
        if (tokenResponse) {
            await setRefreshTimer(tokenResponse.expires_in); // 重新设置定时器
        }
    }, expiresInSeconds * 1000);
}

async function refreshAccessToken() {
    if (!googleOauthClientID || !googleOauthClientSecret) {
        return null;
    }
    const refreshToken = await getClientStorageValue(StorageKey.GoogleRefreshToken);

    if (refreshToken) {
        const requestBody = formRequestBody({
            client_id: googleOauthClientID,
            client_secret: googleOauthClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        });

        const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: requestBody,
        }).then(res => res.json());

        if (tokenResponse.access_token) {
            const expiresIn = tokenResponse.expires_in;
            const expireDate = new Date();
            expireDate.setSeconds(expireDate.getSeconds() + expiresIn);

            setLocalStorage(StorageKey.GoogleAccessToken, tokenResponse.access_token);
            setLocalStorage(StorageKey.GoogleAccessTokenExpireDate, expireDate.toISOString());

            console.log('[Oauth] Successfully refreshing token');
            return tokenResponse; // 返回成功
        } else {
            console.error('[Oauth] Error refreshing access token:', tokenResponse);
            return null; // 返回失败
        }
    } else {
        console.error('[Oauth] Refresh token is missing');
        return null; // 返回失败
    }
}

async function accessTokenExpiredIn(expireDateStr: string | null): Promise<number> {
    if (expireDateStr) {
        const expireDate = new Date(expireDateStr);
        const currentDate = new Date();
        const timeUntilExpiration = (expireDate.getTime() - currentDate.getTime()) / 1000; // 转换为秒
        return timeUntilExpiration;
    }
    return -1; // 如果没有过期日期，假设令牌已过期
}
