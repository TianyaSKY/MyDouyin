export const validateUsername = (username) => {
  if (!username || username.trim().length === 0) {
    return '用户名不能为空';
  }
  if (username.length < 3) {
    return '用户名至少需要3个字符';
  }
  if (username.length > 20) {
    return '用户名不能超过20个字符';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return '用户名只能包含字母、数字和下划线';
  }
  return null;
};

export const validatePassword = (password) => {
  if (!password || password.length === 0) {
    return '密码不能为空';
  }
  if (password.length < 6) {
    return '密码至少需要6个字符';
  }
  if (password.length > 50) {
    return '密码不能超过50个字符';
  }
  return null;
};

export const validateNickname = (nickname) => {
  if (nickname && nickname.trim().length > 0) {
    if (nickname.length > 20) {
      return '昵称不能超过20个字符';
    }
  }
  return null;
};

export const validateForm = (username, password, nickname, isRegister) => {
  const errors = {};
  
  const usernameError = validateUsername(username);
  if (usernameError) errors.username = usernameError;
  
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  
  if (isRegister && nickname) {
    const nicknameError = validateNickname(nickname);
    if (nicknameError) errors.nickname = nicknameError;
  }
  
  return errors;
};